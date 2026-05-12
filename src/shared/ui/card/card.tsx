import {
  cardBodyVariants,
  cardFooterVariants,
  cardHeaderVariants,
  cardNoticeVariants,
  cardVariants,
} from './card.variants'
import type {
  CardFormProps,
  CardNoticeProps,
  CardProps,
  CardSectionProps,
} from './card.types'

export function Card({ children, padding = 'none', ...props }: CardProps) {
  return (
    <div className={cardVariants({ padding })} {...props}>
      {children}
    </div>
  )
}

export function CardForm({
  children,
  padding = 'none',
  ...props
}: CardFormProps) {
  return (
    <form className={cardVariants({ padding })} {...props}>
      {children}
    </form>
  )
}

export function CardHeader({
  children,
  padding = 'md',
  ...props
}: CardSectionProps) {
  return (
    <header className={cardHeaderVariants({ padding })} {...props}>
      {children}
    </header>
  )
}

export function CardBody({
  children,
  padding = 'md',
  ...props
}: CardSectionProps) {
  return (
    <div className={cardBodyVariants({ padding })} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({
  children,
  padding = 'md',
  ...props
}: CardSectionProps) {
  return (
    <footer className={cardFooterVariants({ padding })} {...props}>
      {children}
    </footer>
  )
}

export function CardNotice({
  children,
  tone = 'info',
  ...props
}: CardNoticeProps) {
  return (
    <div className={cardNoticeVariants({ tone })} {...props}>
      {children}
    </div>
  )
}
