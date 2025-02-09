/* @flow */

import Type from '../types/Type';
import ObjectType from '../types/ObjectType';
import getErrorMessage from '../getErrorMessage';
import compareTypes from '../compareTypes';

import invariant from '../invariant';

import ObjectTypeProperty from '../types/ObjectTypeProperty';
import FunctionType from '../types/FunctionType';


import type Validation, {IdentifierPath} from '../Validation';

type Mapper = <V: any, R: any> (v: V) => R;

// Map over the keys and values in an object.

export default class $ObjMapiType<O: {}, M: Mapper> extends Type<$ObjMapi<O, M>> {
  typeName: string = '$ObjMapiType';

  object: Type<O>;
  mapper: Type<M>;

  collectErrors (validation: Validation<any>, path: IdentifierPath, input: any): boolean {
    let {object, mapper, context} = this;
    const target = object.unwrap();
    invariant(target instanceof ObjectType, 'Target must be an object type.');

    if (input === null || (typeof input !== 'object' && typeof input !== 'function')) {
      validation.addError(path, this, getErrorMessage('ERR_EXPECT_OBJECT'));
      return true;
    }

    let hasErrors = false;
    for (const prop: ObjectTypeProperty<*, *> of target.properties) {
      const applied = mapper.unwrap();
      invariant(applied instanceof FunctionType, 'Mapper must be a function type.');

      const returnType = applied.invoke(context.literal(prop.key), prop.value);

      const value = input[prop.key];
      if (returnType.collectErrors(validation, path.concat(prop.key), value)) {
        hasErrors = true;
      }
    }

    return hasErrors;
  }

  accepts (input: any): boolean {
    let {object, mapper, context} = this;
    const target = object.unwrap();
    invariant(target instanceof ObjectType, 'Target must be an object type.');

    if (input === null || (typeof input !== 'object' && typeof input !== 'function')) {
      return false;
    }

    for (const prop: ObjectTypeProperty<*, *> of target.properties) {
      const applied = mapper.unwrap();
      invariant(applied instanceof FunctionType, 'Mapper must be a function type.');

      const returnType = applied.invoke(context.literal(prop.key), prop.value);

      const value = input[prop.key];
      if (!returnType.accepts(value)) {
        return false;
      }
    }
    return true;
  }

  compareWith (input: Type<any>): -1 | 0 | 1 {
    return compareTypes(this.unwrap(), input);
  }

  unwrap (): Type<$ObjMapi<O, M>> {
    let {object, mapper, context} = this;
    const target = object.unwrap();
    invariant(target instanceof ObjectType, 'Target must be an object type.');

    const args = [];

    for (const prop: ObjectTypeProperty<*, *> of target.properties) {
      const applied = mapper.unwrap();
      invariant(applied instanceof FunctionType, 'Mapper must be a function type.');

      args.push(context.property(
        prop.key,
        applied.invoke(context.literal(prop.key), prop.value)
      ));
    }

    return context.object(...args);
  }

  toString (): string {
    return `$ObjMapi<${this.object.toString()}, ${this.mapper.toString()}>`;
  }

  toJSON () {
    return {
      typeName: this.typeName,
      object: this.object,
      mapper: this.mapper
    };
  }
}