import { Async } from './Async'
import * as React from 'react'
import { Subscription, Subject, Observable } from 'rxjs'

export interface ConstantProps<T> {
  getter: () => Promise<T>
  children: (data: T, progress: Async.Progress) => JSX.Element
  placeholder?: (progress: Async.Progress.Progressing | Async.Progress.Error) => JSX.Element
}

export interface ConstantState<T> {
  value: Async.Data<T | null>
}

export class Constant<T> extends React.Component<ConstantProps<T>, ConstantState<T>> {
  subscriptions: Subscription[] = []
  reloadSubject = new Subject()
  state: ConstantState<T> = {
    value: Async.create(null, Async.Type.Load, Async.Progress.Progressing)
  }
  render() {
    if (!this.state.value.data) {
      return this.props.placeholder ? this.props.placeholder(this.state.value.state.progress as any) : null
    }
    return this.props.children(this.state.value.data, this.state.value.state.progress)
  }
  componentWillUnmount() {
    this.subscriptions.forEach(s => {
      s.unsubscribe()
    })
  }
  componentDidUpdate(prevProps: ConstantProps<T>) {
    if (this.props.getter !== prevProps.getter) {
      this.reloadSubject.next()
    }
  }
  componentDidMount() {
    this.subscriptions.push(
      this.reloadSubject
        .startWith(0)
        .do(() => {
          this.setState({
            value: Async.setProgress(this.state.value, Async.Progress.Progressing)
          })
        })
        .startWith(0)
        .switchMap(() => {
          return Observable.fromPromise(this.props.getter()).catch(() => {
            this.setState({
              value: Async.setProgress(this.state.value, Async.Progress.Error)
            })
            return Observable.of(null)
          })
        })
        .filter(x => !!x)
        .subscribe(value => {
          this.setState({
            value: Async.set(this.state.value, value!, Async.Progress.Done)
          })
        })
    )
  }
}