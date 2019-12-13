## babel-plugin-access-control-autocomplete

[![Build Status](https://img.shields.io/travis/morlay/babel-plugin-access-control-autocomplete.svg?style=flat-square)](https://travis-ci.org/morlay/babel-plugin-access-control-autocomplete)
[![NPM](https://img.shields.io/npm/v/babel-plugin-access-control-autocomplete.svg?style=flat-square)](https://npmjs.org/package/babel-plugin-access-control-autocomplete)
[![Dependencies](https://img.shields.io/david/morlay/babel-plugin-access-control-autocomplete.svg?style=flat-square)](https://david-dm.org/morlay/babel-plugin-access-control-autocomplete)
[![License](https://img.shields.io/npm/l/babel-plugin-access-control-autocomplete.svg?style=flat-square)](https://npmjs.org/package/babel-plugin-access-control-autocomplete)

Autocomplete AccessControl React HoC.

When added access control for each Component, we may added some component as below:

```typescript jsx
import { mustAllOfPermissions } from "src-core/access";
import { AcComponent2 } from "other";
import { useRequest, useTempDataForRequest } from "some-request";
import { listApp, putApp } from "some-clients"

export const AcComponent = mustAllOfPermissions(AcComponent2, listApp, putApp)(() => {
  const [] = useRequest(putApp, {});
  const [] = useTempDataForRequest(listApp, {});

  return <AcComponent2 />;
})
```

but it will be boring and easy to make mistake.

with this plugin we could use special named component (`Ac(Every)Component` and `AcSomeComponet`) to autocomplete the `AccessControlComponent`.

the key of access control should be from request method, we could collect them by `use(\w+)?Request` or `useAc(\w+)` hooks or `create(\w+)?Request` HoC.
and `AccessControlComponent` will be composed too.

```typescript jsx
export const AcComponent = () => {
  const [] = useRequest(putApp, {});
  const [] = useTempDataForRequest(listApp, {});

  return <AcComponent2 />;
}
```

will be transform to 

```typescript jsx
export const AcComponent = mustAllOfPermissions(AcComponent2, listApp, putApp)(() => {
  const [] = useRequest(putApp, {});
  const [] = useTempDataForRequest(listApp, {});

  return <AcComponent2 />;
})
```

