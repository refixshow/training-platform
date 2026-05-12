# Coach Client Management Feature

## Feature DSL

```yaml
feature: coach-client-management
status: planned
surface: coach-app
primary_route_candidate: /clients
invite_route_candidate: /clients/invites
public_accept_route_candidate: /invite/$token
primary_actor: coach
secondary_actor: trainee
business_goal:
  - Let coaches invite people into their client list without manual database setup.
  - Automatically connect a new or existing trainee account to the inviting coach.
  - Keep training submission locked until the coach activates an owned program for that trainee.
scope:
  include:
    - Coach invite creation surface.
    - Shareable invite link.
    - Optional invite email target.
    - Invite acceptance for unauthenticated people through sign-up.
    - Invite acceptance for already authenticated trainee accounts.
    - Automatic coach-trainee relationship creation after valid acceptance.
    - Managed client list integration.
    - Client detail setup state when no active program exists.
    - Coach action to activate one of their programs for a managed trainee.
    - Trainee-side blocked state when assigned to a coach but without an active program.
    - Submission authorization that requires an active assigned program.
    - Loading, empty, expired, revoked, already-used, wrong-role, and already-managed states.
  include_as_integration:
    - /clients list action: invite client.
    - /clients/$clientId detail action: activate program.
    - /assignments program selection and activation flow.
    - /my-program trainee empty/blocked state.
    - /my-program/training submission guard.
  exclude:
    - Payments or subscription gating.
    - Coach-to-coach transfer workflow.
    - Bulk imports.
    - Email delivery provider integration unless explicitly scoped.
    - Separate admin role for client management in MVP.
    - Trainee self-selecting a coach without an invite.
data:
  owned_records:
    - clientInvites
    - users.coachId
    - programAssignments
  related_records:
    - programs
    - trainingResults
    - activities
  required_invite_fields:
    - coachId
    - tokenHash
    - status
    - createdAt
    - expiresAt
  optional_invite_fields:
    - intendedEmail
    - acceptedAt
    - acceptedUserId
    - revokedAt
    - note
  assignment_fields:
    - coachId
    - traineeId
    - programId
    - assignedAt
    - status
validation:
  invite_creation: coach/admin only
  invite_acceptance: token must be valid, unexpired, unused, and not revoked
  coach_relationship: accepted trainee becomes managed by invite coach
  active_program_required: trainee can submit only for an active assignment
  program_activation: coach can activate only their own program for their managed trainee
architecture:
  route_clients: src/routes/clients.tsx
  route_invite_accept: src/routes/invite.$token.tsx
  widget_clients: src/widgets/coach-client-list
  feature_create_invite: src/features/create-client-invite
  feature_accept_invite: src/features/accept-client-invite
  feature_activate_client_program: src/features/activate-client-program
  backend_invites: convex/clientInvites.ts
  backend_assignments: convex/programAssignments.ts
  backend_training_results: convex/trainingResults.ts
```

## Product Decisions

- A coach manages clients through an invite-first flow. Manual client creation can be added later, but MVP should prefer a shareable link because it works for both new and existing accounts.
- Accepting a valid invite assigns the trainee to the inviting coach by setting the trainee relationship server-side.
- If the person does not have an account, the invite acceptance flow sends them through sign-up and then applies the invite after authentication.
- If the person already has a trainee account, accepting the invite attaches that account to the coach.
- If the account is already assigned to the same coach, accepting the invite is idempotent and should show a success state.
- If the account is assigned to a different coach, MVP should block automatic reassignment and explain that transfer needs a separate flow.
- Coach/admin is still one MVP permission bucket. Do not create a separate admin client-management surface yet.
- Being assigned to a coach is not the same as having an active program.
- A trainee without an active program can sign in and see a blocked/empty program state, but cannot start or submit training.
- A coach can activate training for a managed trainee by assigning one of their own programs.
- Program assignment persistence is still governed by the existing open decision: live reference versus trainee-specific snapshot. This feature should not resolve that silently.

## User Stories

### US1: Coach Creates Invite Link

Priority: P1

As a coach, I want to create a client invite link, so that a person can join my client list without manual setup.

Independent test: a signed-in coach creates an invite and receives a public URL that can be opened in another browser session.

Acceptance:

- GIVEN a signed-in coach, WHEN they create an invite, THEN the system creates a pending invite owned by that coach.
- GIVEN an invite is created, WHEN the coach copies the link, THEN the link contains an opaque token and no raw coach id.
- GIVEN a coach has old invites, WHEN they view invite state, THEN pending, accepted, expired, and revoked states are distinguishable.
- GIVEN a non-coach user, WHEN they try to create an invite, THEN Convex rejects the mutation.

### US2: New Person Accepts Invite And Creates Account

Priority: P1

As an invited person without an account, I want to sign up from the invite link, so that my new trainee account is connected to the coach automatically.

Independent test: open `/invite/$token` while signed out, create an account, and see the new user in the coach's `/clients` list.

Acceptance:

- GIVEN a valid invite link, WHEN a signed-out person opens it, THEN they see an invitation acceptance/sign-up flow.
- GIVEN the person completes sign-up, WHEN the account is created, THEN the account role is trainee and `users.coachId` points to the inviting coach.
- GIVEN the invite was accepted, WHEN the coach opens `/clients`, THEN the new trainee appears in the managed client list.
- GIVEN the invite is expired, revoked, or already accepted by another user, WHEN the link is opened, THEN the flow shows a safe blocked state and does not create a coach relationship.

### US3: Existing Trainee Accepts Invite

Priority: P1

As a trainee who already has an account, I want to accept a coach invite, so that I am assigned to that coach without creating another account.

Independent test: sign in as an unassigned trainee, open a valid invite, accept it, and verify the coach can see the trainee.

Acceptance:

- GIVEN a signed-in unassigned trainee, WHEN they accept a valid invite, THEN `users.coachId` is set to the inviting coach.
- GIVEN a signed-in trainee already assigned to the same coach, WHEN they accept the invite, THEN the flow succeeds without duplicating relationships.
- GIVEN a signed-in trainee assigned to another coach, WHEN they accept the invite, THEN the system blocks automatic reassignment.
- GIVEN a signed-in coach account, WHEN it opens a trainee invite, THEN the system blocks acceptance because coach accounts cannot become trainee clients.

### US4: Coach Activates Program For Managed Client

Priority: P1

As a coach, I want to activate one of my programs for a managed client, so that the client can start training.

Independent test: coach chooses a managed trainee with no active program, assigns an owned program, and the trainee can open the program route.

Acceptance:

- GIVEN a managed trainee has no active program, WHEN the coach opens the client row/detail, THEN the UI shows a clear `Aktywuj program` or `Przypisz program` action.
- GIVEN the coach selects one of their owned programs, WHEN they submit activation, THEN an active assignment is created for that trainee.
- GIVEN the selected program belongs to another coach, WHEN activation is attempted, THEN Convex rejects the mutation.
- GIVEN the selected user is not managed by the coach, WHEN activation is attempted, THEN Convex rejects the mutation.
- GIVEN an active assignment already exists, WHEN the coach assigns another active program, THEN the flow follows the final assignment lifecycle rule instead of silently creating ambiguous active programs.

### US5: Trainee Cannot Submit Without Active Program

Priority: P1

As a trainee assigned to a coach, I want the app to clearly block training submission until a program is active, so that I do not submit orphaned or unreviewable results.

Independent test: a trainee with `coachId` but no active assignment cannot open a valid submission target or call the submit mutation successfully.

Acceptance:

- GIVEN a trainee has a coach but no active program, WHEN they open `/my-program`, THEN they see a blocked empty state explaining that the coach has not activated a program yet.
- GIVEN a trainee has no active program, WHEN they attempt to submit training through Convex, THEN the mutation rejects the submission.
- GIVEN a trainee has an active assignment, WHEN they submit a routine reachable from that assignment, THEN submission can proceed if all routine and field validation passes.
- GIVEN a trainee tries to submit a routine not reachable from an active assignment, WHEN the mutation runs, THEN Convex rejects it even if the routine id is valid.

## UX Shape

Coach-side client management should feel like an operations workflow inside `/clients`, not a separate admin portal.

Primary coach entry points:

- `/clients`: list of managed clients with a primary `Zapros klienta` action.
- `/clients`: empty state includes `Zapros klienta`.
- `/clients/$clientId`: setup/status area shows whether the client has an active program.
- `/assignments`: can remain the detailed assignment surface, but should support preselecting a trainee from `/clients/$clientId`.

Invite creation surface:

- Use a compact panel or page section, not a blocking modal-first flow.
- Optional email field: helps label the invite and can later support email sending.
- Expiration label: show when the link expires.
- Copy-link action with success feedback.
- Invite list: pending, accepted, expired, revoked.

Invite acceptance surface:

- Public route reads token metadata without exposing coach internals.
- If signed out: show coach name if safe, then sign-up/sign-in choices.
- If signed in as eligible trainee: show one accept action.
- If signed in as wrong role or already assigned elsewhere: show blocked state.
- After acceptance: route the trainee to `/my-program`; if no active program exists yet, show the blocked program state.

Trainee blocked state:

- Copy should be calm and direct: the coach has not activated a program yet.
- Do not show fake workout actions.
- Do not expose coach-side program library or invite internals.

Coach activation state:

- If client has no active program, make that state visible in the client list and detail.
- Action should lead to a program selector limited to coach-owned programs.
- Programs with no routines should be blocked or warned according to the existing program assignment rules.

## Data Model Plan

Recommended new table:

```ts
clientInvites: defineTable({
  acceptedAt: v.optional(v.number()),
  acceptedUserId: v.optional(v.id('users')),
  coachId: v.id('users'),
  createdAt: v.number(),
  expiresAt: v.number(),
  intendedEmail: v.optional(v.string()),
  note: v.optional(v.string()),
  revokedAt: v.optional(v.number()),
  status: v.union(
    v.literal('pending'),
    v.literal('accepted'),
    v.literal('revoked'),
    v.literal('expired'),
  ),
  tokenHash: v.string(),
})
  .index('by_coach', ['coachId'])
  .index('by_token_hash', ['tokenHash'])
  .index('by_coach_and_status', ['coachId', 'status'])
```

Token rules:

- Generate a high-entropy token server-side.
- Store only `tokenHash`, never the raw token.
- Return the raw token only once when creating the invite.
- Public accept route sends the raw token to Convex; Convex hashes and looks up `by_token_hash`.
- Expired invites should be treated as unusable even if their stored status has not been lazily updated yet.

User relationship:

- `users.coachId` remains the MVP relationship between coach and trainee.
- Accepting invite updates `users.coachId` only after role and existing-coach checks pass.
- Do not let the client pass a trusted `coachId`; derive it from the invite.

Program activation:

Existing `programAssignments` can represent activated programs, but the feature needs an explicit lifecycle if multiple assignments or deactivation are allowed.

Recommended tightening:

- Add `status` to `programAssignments`: `active`, `inactive`, `completed`, or `archived`.
- Add `activatedAt` or continue using `assignedAt` as the activation timestamp.
- Add an indexed lookup for active assignments by trainee, such as `by_trainee_and_status`.
- Keep `programId`, `coachId`, and `traineeId` on assignment for authorization and review.

If assignment status is not added in the first implementation, then "active program" means the latest valid assignment for the trainee. This is simpler but weaker, and it should be treated as an MVP shortcut.

## Backend API Plan

Convex module: `convex/clientInvites.ts`

Functions:

- `createInvite`: mutation, coach/admin only, creates pending invite and returns one-time link token.
- `listInvitesByCoach`: query, coach/admin only, returns bounded invite history for the signed-in coach.
- `revokeInvite`: mutation, coach/admin only, revokes a pending invite owned by the coach.
- `getInvitePreview`: query, public or auth-optional, returns safe invite metadata for `/invite/$token`.
- `acceptInvite`: mutation, authenticated user only, validates token and assigns the trainee to the invite coach.
- `acceptInviteAfterSignUp`: integration path after auth sign-up, either same mutation or a small client flow that calls `acceptInvite` once auth is established.

Convex module: `convex/programAssignments.ts`

Functions to align or extend:

- `activateForClient`: mutation, coach/admin only, assigns or activates a coach-owned program for a managed trainee.
- `getActiveForTrainee`: query/helper, trainee-owned, returns active assignment for `/my-program`.
- `requireActiveAssignmentForRoutine`: internal helper for training submission authorization.

Convex module: `convex/trainingResults.ts`

Submission guard:

- `submit` must verify the authenticated trainee has an active assignment.
- The submitted routine must be reachable from the active assigned program.
- The mutation must reject valid-looking routine ids that are not reachable through the trainee's active assignment.

Authorization:

- Invite creation/list/revoke: signed-in coach/admin, scoped to own invites.
- Invite preview: safe metadata only; no user list or internal ids.
- Invite acceptance: authenticated trainee only.
- Client relationship update: server-side only from accepted invite.
- Program activation: signed-in coach/admin, `program.ownerCoachId === coach._id`, `trainee.coachId === coach._id`.
- Submission: signed-in trainee, active assignment required, routine reachability required.

Validation and error shape:

- Expired invite: blocked, invite can no longer be accepted.
- Revoked invite: blocked, ask for a new link.
- Accepted invite: if accepted by current user, show already connected; otherwise blocked.
- Wrong role: explain that a coach/admin account cannot accept a client invite.
- Existing different coach: explain that transfer is not automatic in MVP.
- No active program: trainee-side blocked state, coach-side activation CTA.

## Frontend Architecture

Recommended Feature-Sliced placement:

- `src/features/create-client-invite`: invite form, copy-link state, optional intended email validation.
- `src/features/accept-client-invite`: token preview, auth-aware acceptance flow, blocked states.
- `src/features/activate-client-program`: program selector, submit state, server error handling.
- `src/widgets/coach-client-list`: integrates invite CTA and no-program activation context.
- `src/widgets/coach-client-dashboard`: integrates active program state and activation CTA.
- `src/routes/invite.$token.tsx`: public/auth-aware invite acceptance route.
- `convex/clientInvites.ts`: invite lifecycle and relationship mutation.
- `convex/programAssignments.ts`: active assignment lifecycle.
- `convex/trainingResults.ts`: submit guard.

Reuse strategy:

- Reuse `requireCoachAdmin(ctx)` for coach-side invite and activation mutations.
- Reuse `users.by_coach` for managed client lists.
- Reuse program selector data from program assignment where possible.
- Reuse assignment validation rules from `/assignments` rather than creating a second incompatible activation path.
- Reuse trainee assigned-program view model for `/my-program` blocked and active states.

Do not reuse directly:

- Do not let invite acceptance call coach-owned user assignment functions without token validation.
- Do not trust route params or search params for coach id.
- Do not let training submission rely only on UI disabled states.

## Main Flows

### Coach Invites New Client

1. Coach opens `/clients`.
2. Coach chooses `Zapros klienta`.
3. Coach optionally enters email/note and creates invite.
4. Convex creates pending invite and returns one-time raw token.
5. UI shows copyable link.
6. Coach sends link outside the app or future email integration sends it.

### Invited Person Has No Account

1. Person opens `/invite/$token`.
2. App validates safe invite preview.
3. Person signs up as trainee.
4. App calls invite acceptance after auth is established.
5. Convex sets `users.coachId` to invite coach and marks invite accepted.
6. Trainee lands in `/my-program`.
7. If no active program exists, trainee sees blocked waiting state.

### Invited Person Has Account

1. Trainee opens `/invite/$token` while signed in.
2. App shows coach invite preview and accept action.
3. Convex validates token and role.
4. Convex assigns trainee to coach or returns idempotent success.
5. Coach sees trainee on `/clients`.

### Coach Activates Program

1. Coach sees client state `Bez programu` on `/clients` or `/clients/$clientId`.
2. Coach opens activation flow.
3. Coach selects one owned program.
4. Convex validates coach ownership and trainee relationship.
5. Convex creates or updates active assignment.
6. Trainee can now view `/my-program` and submit reachable routines.

### Trainee Attempts Submission Without Active Program

1. Trainee opens `/my-program` and has no active assignment.
2. UI shows blocked empty state.
3. If a submit mutation is called anyway, Convex rejects it.
4. No `trainingResults`, set rows, or activities are created.

## Edge Cases

- Invite token is malformed: show invalid-link state; do not reveal whether a coach exists.
- Invite expired between preview and acceptance: acceptance mutation rejects and UI refreshes state.
- Invite accepted twice by same signed-in trainee: idempotent success.
- Invite accepted by one user, then opened by another: blocked as already used.
- Intended email differs from signed-in email: warn or block. MVP recommendation: warn if intended email exists, but block only after product confirms strict email binding.
- Trainee already has another coach: block automatic reassignment.
- Coach deletes/deactivates a program after selecting it but before activation: mutation rejects.
- Program has no routines: follow `/assignments` rule; recommended block activation because it would not enable useful submission.
- Multiple active assignments: avoid in MVP by rejecting a second active assignment until assignment lifecycle is defined.
- Existing historical training results remain visible after program deactivation/archive, but new submissions require an active assignment.

## Implementation Plan

1. Add `clientInvites` table and indexes to `convex/schema.ts`.
2. Add invite token generation and hashing helper local to `convex/clientInvites.ts`.
3. Add `createInvite`, `listInvitesByCoach`, `revokeInvite`, `getInvitePreview`, and `acceptInvite`.
4. Add auth/sign-up integration so `/invite/$token` can resume acceptance after account creation.
5. Add `src/routes/invite.$token.tsx` and `src/features/accept-client-invite`.
6. Add invite creation panel in `/clients` via `src/features/create-client-invite`.
7. Extend `/clients` empty and no-program states with invite and activation CTAs.
8. Decide assignment lifecycle status before implementing multiple active programs.
9. Add or adapt `activateForClient` in `convex/programAssignments.ts`.
10. Update trainee `/my-program` query to return blocked state when assigned to a coach but no active program exists.
11. Update training submission mutation to require an active assignment and routine reachability.
12. Add tests for invite acceptance, role rejection, already-managed accounts, activation ownership, and submission guard.
13. Run Convex codegen/checks, `npm run typecheck`, `npm run test`, `npm run build`, and browser checks for signed-out invite, signed-in trainee invite, coach `/clients`, and trainee blocked program state.

## Acceptance Criteria

- Coach can create a shareable invite link.
- Coach can see invite status history for their own invites.
- Coach can revoke a pending invite.
- Invite link does not expose raw coach id or trusted relationship data.
- Signed-out invited person can create an account and become a trainee managed by the inviting coach.
- Existing unassigned trainee can accept an invite and become managed by the inviting coach.
- Coach/admin accounts cannot accept trainee invites.
- Trainees already managed by another coach are not silently reassigned.
- Accepted trainee appears in the coach's `/clients` list.
- Managed trainee with no active program cannot submit training.
- Coach can activate one owned program for a managed trainee.
- Trainee with an active assigned program can open the assigned program and submit only reachable routines.
- Convex enforces invite, relationship, activation, and submission rules server-side.
- Loading, empty, expired, revoked, accepted, unauthorized, and wrong-role states are visible and understandable.

## Test Checklist

- `CONVEX_DEPLOYMENT=dev:grandiose-cat-547 npx convex codegen --typecheck disable`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Convex invite: coach creates pending invite.
- Convex invite: unauthenticated/non-coach cannot create invite.
- Convex invite: revoked/expired invite cannot be accepted.
- Convex invite: signed-in trainee accepts and gets `coachId`.
- Convex invite: coach account cannot accept trainee invite.
- Convex invite: trainee assigned to another coach is blocked.
- Convex activation: coach activates own program for managed trainee.
- Convex activation: coach cannot activate another coach's program.
- Convex activation: coach cannot activate program for unmanaged trainee.
- Convex submission: trainee without active assignment is rejected.
- Convex submission: trainee cannot submit routine outside active assignment.
- Browser: signed-out invite route sign-up and continuation.
- Browser: signed-in trainee invite acceptance.
- Browser: `/clients` empty state, invite action, no-program state, activation CTA.
- Browser: `/my-program` blocked state without active program.

## Open Follow-Ups

- Decide invite expiration duration. MVP suggestion: 7 days.
- Decide whether intended email should strictly bind invite acceptance or only label/warn.
- Decide whether invite links are single-use only or can allow multiple people. MVP suggestion: single-use.
- Decide whether program assignments get explicit `status` before activation flow ships.
- Decide whether multiple active programs per trainee are allowed. MVP suggestion: one active program.
- Decide live reference versus snapshot for assigned programs before hardening activation/submission history.
- Decide whether coach transfer/reassignment needs a separate approval flow.
