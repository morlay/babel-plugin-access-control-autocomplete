import { NodePath } from "@babel/traverse";

import {
  CallExpression,
  callExpression,
  Expression,
  Identifier,
  identifier,
  importDeclaration,
  importSpecifier,
  isArrowFunctionExpression,
  isCallExpression,
  isIdentifier,
  isImportDeclaration,
  JSXIdentifier,
  Program,
  stringLiteral,
  VariableDeclarator,
} from "@babel/types";

const isAccessControlEveryComponent = (id = "") =>
  id.startsWith("Ac") || id.startsWith("AcEvery");
const isAccessControlSomeComponent = (id = "") => id.startsWith("AcSome");
const isAccessControlComponent = (id = "") =>
  isAccessControlEveryComponent(id) || isAccessControlSomeComponent(id);
const isUseRequestHook = (id = "") => /use(\w+)?Request/.test(id);
const isCreateRequestMethod = (id = "") => /create(\w+)?Request/.test(id);

const isNeedToMarkedAccessControlExpression = (
  opts: State["opts"],
  e: Expression | null,
): boolean => {
  if (isArrowFunctionExpression(e)) {
    return true;
  }
  if (isCallExpression(e) && isIdentifier(e.callee)) {
  }

  if (isCallExpression(e)) {
    if (isIdentifier(e.callee)) {
      const callName = e.callee.name;

      return !(
        callName === opts.methodAccessControlEvery ||
        callName === opts.methodAccessControlSome
      );
    } else if (isCallExpression(e.callee) && isIdentifier(e.callee.callee)) {
      const callName = e.callee.callee.name;

      return !(
        callName === opts.methodAccessControlEvery ||
        callName === opts.methodAccessControlSome
      );
    }
  }
  return false;
};

const scanDeps = (nodePath: NodePath): Identifier[] => {
  const ids: { [k: string]: true } = {};

  nodePath.traverse({
    JSXIdentifier(nodePath: NodePath<JSXIdentifier>) {
      if (isAccessControlComponent(nodePath.node.name)) {
        ids[nodePath.node.name] = true;
      }
    },
    CallExpression: {
      exit(nodePath: NodePath<CallExpression>) {
        if (
          isIdentifier(nodePath.node.callee) &&
          (isUseRequestHook(nodePath.node.callee.name) ||
            isCreateRequestMethod(nodePath.node.callee.name)) &&
          nodePath.node.arguments[0]
        ) {
          const arg0 = nodePath.node.arguments[0];

          if (isIdentifier(arg0)) {
            ids[arg0.name] = true;
          }
        }
      },
    },
  });

  return Object.keys(ids)
    .sort()
    .map((id) => identifier(id));
};

function importMethodTo(path: NodePath<Program>, method: string, mod: string) {
  const importDecl = importDeclaration(
    [importSpecifier(identifier(method), identifier(method))],
    stringLiteral(mod),
  );

  const targetPath = findLast(path.get("body") as NodePath[], (p) =>
    isImportDeclaration(p),
  );

  if (targetPath) {
    targetPath.insertAfter([importDecl]);
  } else {
    if (path.get("body")) {
      (path.get("body") as NodePath[])[0].insertBefore(importDecl);
    }
  }
}

function findLast<T>(arr: T[], predicate: (item: T) => boolean): T | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) {
      return arr[i];
    }
  }
  return null;
}

interface State {
  opts: {
    libAccessControl: "src-core/access";
    methodAccessControlSome: "mustOneOfPermissions";
    methodAccessControlEvery: "mustAllOfPermissions";
  };
  methodAccessControlSomeUsed?: boolean;
  methodAccessControlEveryUsed?: boolean;
}

function resolveOpts(opts: State["opts"] = {} as any) {
  return {
    libAccessControl: opts.libAccessControl || "src-core/access",
    methodAccessControlSome:
      opts.methodAccessControlSome || "mustOneOfPermissions",
    methodAccessControlEvery:
      opts.methodAccessControlEvery || "mustAllOfPermissions",
  };
}

export default () => ({
  name: "access-control-autocomplete",
  visitor: {
    Program: {
      exit(nodePath: NodePath<Program>, state: State) {
        const opts = resolveOpts(state.opts);

        if (
          state.methodAccessControlEveryUsed &&
          !nodePath.scope.hasBinding(opts.methodAccessControlEvery)
        ) {
          importMethodTo(
            nodePath,
            opts.methodAccessControlEvery,
            opts.libAccessControl,
          );
        }

        if (
          state.methodAccessControlSomeUsed &&
          !nodePath.scope.hasBinding(opts.methodAccessControlSome)
        ) {
          importMethodTo(
            nodePath,
            opts.methodAccessControlSome,
            opts.libAccessControl,
          );
        }
      },
    },
    VariableDeclarator: {
      enter(nodePath: NodePath<VariableDeclarator>, state: State) {
        const opts = resolveOpts(state.opts);

        if (
          isIdentifier(nodePath.node.id) &&
          isAccessControlComponent(nodePath.node.id.name) &&
          isNeedToMarkedAccessControlExpression(opts, nodePath.node.init)
        ) {
          if (isAccessControlSomeComponent(nodePath.node.id.name)) {
            state.methodAccessControlSomeUsed = true;

            nodePath.replaceWith({
              ...nodePath.node,
              init: callExpression(
                callExpression(
                  identifier(opts.methodAccessControlSome),
                  scanDeps(nodePath.get("init") as NodePath),
                ),
                [nodePath.node.init as any],
              ),
            });
          } else if (isAccessControlEveryComponent(nodePath.node.id.name)) {
            state.methodAccessControlEveryUsed = true;

            nodePath.replaceWith({
              ...nodePath.node,
              init: callExpression(
                callExpression(
                  identifier(opts.methodAccessControlEvery),
                  scanDeps(nodePath.get("init") as NodePath),
                ),
                [nodePath.node.init as any],
              ),
            });
          }
        }
      },
    },
  },
});
