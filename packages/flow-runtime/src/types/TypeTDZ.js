/* @flow */

import Type from './Type';
import compareTypes from '../compareTypes';
import type {TypeRevealer} from './';
import type Validation, {IdentifierPath} from '../Validation';
import type ObjectTypeProperty from './ObjectTypeProperty';

import TypeParameterApplication from './TypeParameterApplication';

const warnedInstances = new WeakSet();

const RevealedValue = Symbol('RevealedValue');

export default class TypeTDZ<T: any> extends Type {
  typeName: string = 'TypeTDZ';

  reveal: TypeRevealer<T>;

  // @flowIssue 252
  [RevealedValue]: ? Type<T> = undefined;

  get name (): ? string {
    return (getRevealed(this): any).name;
  }

  collectErrors (validation: Validation<any>, path: IdentifierPath, input: any): boolean {
    return getRevealed(this).collectErrors(validation, path, input);
  }

  accepts (input: any): boolean {
    return getRevealed(this).accepts(input);
  }

  compareWith (input: Type<any>): -1 | 0 | 1 {
    return compareTypes(getRevealed(this), input);
  }

  apply <X> (...typeInstances: Type<X>[]): TypeParameterApplication<T> {
    const target = new TypeParameterApplication(this.context);
    target.parent = getRevealed(this);
    target.typeInstances = typeInstances;
    return target;
  }

  /**
   * Get the inner type or value.
   */
  unwrap (): Type<T> {
    return getRevealed(this).unwrap();
  }

  hasProperty (name: string): boolean {
    const inner = this.unwrap();
    if (inner && typeof inner.hasProperty === 'function') {
      return inner.hasProperty(name);
    }
    else {
      return false;
    }
  }

  getProperty (name: string): ? ObjectTypeProperty<any> {
    const inner = this.unwrap();
    if (inner && typeof inner.getProperty === 'function') {
      return inner.getProperty(name);
    }
  }

  toString (): string {
    return getRevealed(this).toString();
  }

  toJSON () {
    return getRevealed(this).toJSON();
  }
}

function getRevealed <T: any> (container: TypeTDZ<T>): Type<T> {
  const existing = (container: $FlowIssue<252>)[RevealedValue];
  if (existing) {
    return existing;
  }
  else {
    const {reveal} = container;
    const type = reveal();
    if (!type) {
      if (!warnedInstances.has(container)) {
        container.context.emitWarningMessage('Failed to reveal type in Temporal Dead Zone.');
        warnedInstances.add(container);
      }
      return container.context.mixed();
    }
    else if (!(type instanceof Type)) {
      // we got a boxed reference to something like a class
      return container.context.ref(type);
    }
    return type;
  }
}
