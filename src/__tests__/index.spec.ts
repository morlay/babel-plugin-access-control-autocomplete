import { transform } from "@babel/core";
import accessControlAutocomplete from "../";

describe("test cases", () => {
  it("should skip mark if marked", () => {
    expect(
      transformCode(`
import { mustAllOfPermissions } from "src-core/access"; 
const AcComponent = mustAllOfPermissions()(() => null);
`),
    ).toEqual(
      unPad(`
import { mustAllOfPermissions } from "src-core/access";
const AcComponent = mustAllOfPermissions()(() => null);
`),
    );
  });

  it("should mark", () => {
    expect(
      transformCode(`
export const AcComponent = hoc()(() => null);
export const AcSomeComponent = create(() => null);
    `),
    ).toEqual(
      unPad(`
import { mustAllOfPermissions } from "src-core/access";
import { mustOneOfPermissions } from "src-core/access";
export const AcComponent = mustAllOfPermissions()(hoc()(() => null));
export const AcSomeComponent = mustOneOfPermissions()(create(() => null));
`),
    );
  });

  it("should mark with access control component", () => {
    expect(
      transformCode(`
export const AcComponent = () => <div>
  <AcComponent2 />
</div>;
    `),
    ).toEqual(
      unPad(`
import { mustAllOfPermissions } from "src-core/access";
export const AcComponent = mustAllOfPermissions(AcComponent2)(() => <div>
  <AcComponent2 />
</div>);
`),
    );
  });

  it("should mark with useXRequest hook arg", () => {
    expect(
      transformCode(`
import { mustAllOfPermissions } from "src-core/access";
export const AcComponent = () => {
  useRequest(putApp, {});
  useTempDataForRequest(listApp, {})
  return null;
};
`),
    ).toEqual(
      unPad(`
import { mustAllOfPermissions } from "src-core/access";
export const AcComponent = mustAllOfPermissions(listApp, putApp)(() => {
  useRequest(putApp, {});
  useTempDataForRequest(listApp, {});
  return null;
});`),
    );
  });

  it("should mark with createXRequest hoc arg", () => {
    expect(
      transformCode(`
export const AcComponent = createXXXRequest(listApp)(() => null);
`),
    ).toEqual(
      unPad(`
import { mustAllOfPermissions } from "src-core/access";
export const AcComponent = mustAllOfPermissions(listApp)(createXXXRequest(listApp)(() => null));
`),
    );
  });

  it("should mark mixed", () => {
    expect(
      transformCode(`
export const AcComponent = () => {
  useRequest(putApp, {});
  useTempDataForRequest(listApp, {})
  return <AcComponent2 />;
};
`),
    ).toEqual(
      unPad(`
import { mustAllOfPermissions } from "src-core/access";
export const AcComponent = mustAllOfPermissions(AcComponent2, listApp, putApp)(() => {
  useRequest(putApp, {});
  useTempDataForRequest(listApp, {});
  return <AcComponent2 />;
});`),
    );
  });
});

function transformCode(src: string): string {
  return unPad(
    transform(src, {
      babelrc: false,
      parserOpts: {
        plugins: ["jsx"],
      },
      plugins: [
        [accessControlAutocomplete, { libAccessControl: "src-core/access" }],
      ],
    })!.code || "",
  );
}

function unPad(str: string) {
  return str
    .replace(/^\n+|\n+$/, "")
    .replace(/\n+/g, "\n")
    .trim();
}
