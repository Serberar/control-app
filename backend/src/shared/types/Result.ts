export type Success<T> = {
  ok: true
  value: T
}

export type Failure<E> = {
  ok: false
  error: E
}

export type Result<T, E = Error> = Success<T> | Failure<E>

export const Result = {
  ok<T>(value: T): Success<T> {
    return { ok: true, value }
  },

  fail<E>(error: E): Failure<E> {
    return { ok: false, error }
  },
}
