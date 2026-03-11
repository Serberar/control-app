export interface UserProps {
  id: string
  email: string
  passwordHash: string
  name: string
  fcmToken: string | null
  createdAt: Date
  updatedAt: Date
}

export class User {
  readonly id: string
  readonly email: string
  readonly passwordHash: string
  readonly name: string
  readonly fcmToken: string | null
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(props: UserProps) {
    this.id = props.id
    this.email = props.email
    this.passwordHash = props.passwordHash
    this.name = props.name
    this.fcmToken = props.fcmToken
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  static create(props: Omit<UserProps, 'fcmToken' | 'createdAt' | 'updatedAt'>): User {
    return new User({
      ...props,
      fcmToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }
}
