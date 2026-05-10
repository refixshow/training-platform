# Features

## Product Scope

This product is a coaching platform for managing strength and fitness programming between coaches and trainees. It covers exercise library management, routines, multi-week programs, client assignments, workout completion, progress photos, and training statistics.

The product has two primary experiences:

- **Trainee experience:** simple, mobile-first, fast to understand, focused on completing assigned training and tracking progress.
- **Coach experience:** more detailed, data-rich, and operational, focused on programming, reviewing results, and managing clients.

## Roles

### Trainee

A trainee can:

- View assigned programs and routines.
- Complete scheduled or assigned training sessions.
- Fill in set results based on the exercise type.
- Submit training summaries.
- View personal statistics.
- Upload progress photos.
- Track bodyweight and progress over time.

### Coach

A coach can:

- Manage exercises.
- Manage muscle groups.
- Build routines from exercises.
- Build multi-week programs from routines.
- Assign programs to users.
- Review submitted training results.
- View progress photos and statistics for trainees.
- Compare training activity, volume, sets, duration, and bodyweight trends.

### Admin

An admin can:

- Manage primary and secondary muscle groups.
- Manage shared exercise taxonomy and system-level data.
- Support coach-side setup where needed.

Admin may be a separate role or a permission level assigned to coaches. This should be decided during implementation.

## Core Data Models

### Exercise

An exercise includes:

- Photo.
- Name.
- Type.
- Equipment.
- Primary muscle group.
- Secondary muscle groups.
- Instructions as a numbered list.
- Video, either uploaded or linked.

#### Exercise Types

Supported exercise types:

- Weight and reps.
- Reps only.
- Bodyweight.
- Assisted bodyweight.
- Duration.
- Weight and duration.
- Distance and duration.
- Weight and distance.

Each exercise type determines which fields appear when building routine sets and when the trainee logs results.

#### Equipment

Supported equipment values:

- None.
- Other, with a custom text input.
- Barbell.
- Dumbbell.
- Kettlebell.
- Machine.
- Plate.
- Resistance band.
- Suspension.

### Muscle Group

Muscle groups are managed through the admin panel.

A muscle group can be used as:

- Primary muscle group.
- Secondary muscle group.

### Routine

A routine is a reusable training unit made from ordered exercises.

Each routine contains:

- Exercises.
- Sets per exercise.
- Per-set targets based on the exercise type.
- Target RPE.
- Rest duration.
- Optional superset relationship.

Routine set fields depend on the selected exercise type. For example, a weight and reps exercise needs weight and reps or a rep range, while a duration exercise needs duration.

### Program

A program contains:

- Title.
- Description.
- Duration in weeks.
- Routines.

Programs can be assigned to users.

### User

A user can:

- Be assigned to programs.
- Fill in trainings.
- See statistics.
- Upload progress photos.

User profiles should support both trainee-facing progress and coach-facing review.

### Training Result

A training result is created when a trainee submits a training summary.

It includes:

- Completed routine or program context.
- Per-set submitted values.
- Duration.
- Volume.
- Sets completed.
- Activity metadata.
- Optional notes or summary fields.

Training results are visible to both the trainee and the coach.

### Progress Photo

A progress photo includes:

- Uploaded image.
- Date.
- Owner user.
- Optional bodyweight or note.

Photos should be viewable as a timeline or slider.

### Activity

Activities are created when a trainee submits a training summary.

Activities power:

- Activity map.
- Weekly duration.
- Weekly sets.
- Weekly volume.
- Training consistency views.

## Feature Areas

## 1. Exercise Library

### MVP

- Create, edit, delete, and view exercises.
- Upload or attach an exercise photo.
- Add a video link.
- Choose exercise type.
- Choose equipment.
- Select primary muscle group.
- Select secondary muscle groups.
- Add instructions as a numbered list.
- Filter exercises by muscle group, equipment, and type.

### Later

- Uploaded exercise videos.
- Duplicate exercise.
- Exercise alternatives.
- Coach-private and shared exercise libraries.
- Exercise search with fuzzy matching.

## 2. Muscle Group Admin

### MVP

- Create, edit, delete, and view muscle groups.
- Use muscle groups in exercise forms.

### Later

- Sort order.
- Muscle group categories.
- Visibility controls.

## 3. Routine Builder

### MVP

- Create, edit, delete, and view routines.
- Add exercises to a routine.
- Configure sets per exercise.
- Configure per-set targets based on exercise type.
- Set target RPE.
- Set rest duration.
- Mark supersets.

### Later

- Drag-and-drop exercise ordering.
- Routine templates.
- Warm-up sets.
- Notes per exercise.
- Tempo fields.
- Coach-only programming notes.

## 4. Program Builder

### MVP

- Create, edit, delete, and view programs.
- Add title and description.
- Set duration in weeks.
- Attach routines to program weeks or days.
- Assign programs to users.

### Later

- Program calendar view.
- Program duplication.
- Versioning for assigned programs.
- Program progress overview.

## 5. Trainee Training Flow

### MVP

- View assigned program.
- View current routine.
- Read exercise instructions.
- View exercise photo and video link.
- Fill in set results using fields matched to exercise type.
- Track RPE and completed reps, weight, duration, or distance as applicable.
- Submit training summary.
- Create training result on submission.
- Create activity on submission.

### Later

- Rest timer.
- Previous result comparison.
- Inline exercise substitution.
- Offline draft support.
- Training notes.
- Per-set completion shortcuts.

## 6. Coach Review

### MVP

- View submitted training results.
- View trainee training history.
- Inspect set-level performance.
- View weekly volume, duration, sets, and bodyweight.
- View progress photos.
- View activity map.

### Later

- Coach comments on training submissions.
- Alerts for missed sessions.
- Trend comparison across date ranges.
- Client adherence score.
- Export data.

## 7. Statistics

### MVP

Statistics visible to trainee and coach:

- Duration per week.
- Volume per week.
- Sets per week.
- Bodyweight.
- Progress pictures as a slider.
- Activity map based on submitted trainings.

### Later

- Estimated one-rep max trends.
- Muscle group volume distribution.
- Personal records.
- Program adherence.
- Fatigue or RPE trends.

## 8. Progress Photos

### MVP

- Upload progress photos.
- View photos chronologically.
- Compare photos in a slider.
- Allow coach to view trainee photos.

### Later

- Private notes.
- Front, side, and back categories.
- Photo comparison overlays.
- Bodyweight linked to photo upload.

## MVP Feature Set

The first usable version should include:

1. Authentication and role-aware navigation.
2. Exercise library.
3. Muscle group admin.
4. Routine builder.
5. Program builder.
6. Program assignment to users.
7. Trainee workout logging.
8. Training result submission.
9. Coach review of submitted results.
10. Basic statistics: weekly duration, volume, sets, bodyweight, photos, and activity map.

## Non-MVP / Later

These features should not block the first version:

- Payments.
- Chat or direct messaging.
- Meal plans.
- Marketplace.
- Public landing page beyond a basic entry route.
- Advanced analytics.
- Exercise video uploads.
- Push notifications.
- Calendar integrations.
- Native mobile app.

## UX Requirements

### Trainee UX

- Mobile-first.
- Clear current workout state.
- Minimal fields at the moment of logging.
- Exercise media available before or during logging.
- Numeric inputs must be easy to use on mobile.
- Submission must clearly confirm completion.

### Coach UX

- More detailed than trainee views.
- Support tables, filters, tabs, and drill-down detail.
- Avoid overloaded dashboards.
- Make client progress easy to scan.
- Keep programming workflows fast for repeated use.

## Open Decisions

- Should admin be a separate role or a coach permission?
- Should routines be scheduled by day, week, or flexible order inside a program?
- Should assigned programs be copied into a user-specific snapshot or stay linked to the original program?
- Should trainees be able to edit submitted training results?
- Should coaches approve edited results?
- Should progress photos be visible to coach by default?
- Should bodyweight be logged independently, attached to photos, attached to training summaries, or all three?
- Should video support start with links only, or include uploads in MVP?
- Should activity map use calendar-style intensity, simple completion dots, or both?

