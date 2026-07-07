const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const t = require('@babel/types');

const routesDir = path.join(__dirname, 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
files.push('../middleware/auth.js');
files.push('index.js');
files.push('migrate.js'); // may need async conversion
// Wait, migrate.js and index.js we can fix manually if needed. Let's just do routes and auth for now.

for (const file of files) {
  const filePath = path.join(routesDir, file);
  if (!fs.existsSync(filePath)) continue; // handle index.js differently
  const code = fs.readFileSync(filePath, 'utf8');

  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });

  let modified = false;

  traverse(ast, {
    // 1. Convert `const db = getDb();` to `const db = await getDbAsync();`
    CallExpression(path) {
      if (t.isIdentifier(path.node.callee, { name: 'getDb' })) {
        path.node.callee.name = 'getDbAsync';
        if (!t.isAwaitExpression(path.parentPath.node)) {
          path.replaceWith(t.awaitExpression(path.node));
          modified = true;
          // Traverse up and make parent functions async
          let parent = path.getFunctionParent();
          while (parent) {
            parent.node.async = true;
            parent = parent.getFunctionParent();
          }
        }
      }
      
      // 2. Convert `db.run`, `db.get`, `db.all`, `db.exec`, `db.transaction`
      if (t.isMemberExpression(path.node.callee) && t.isIdentifier(path.node.callee.object, { name: 'db' })) {
        const method = path.node.callee.property.name;
        if (['run', 'get', 'all', 'exec', 'transaction'].includes(method)) {
          if (!t.isAwaitExpression(path.parentPath.node)) {
            path.replaceWith(t.awaitExpression(path.node));
            modified = true;
            
            // If it's transaction, make its callback async
            if (method === 'transaction' && path.node.argument.arguments.length > 0) {
              const callback = path.node.argument.arguments[0];
              if (t.isArrowFunctionExpression(callback) || t.isFunctionExpression(callback)) {
                callback.async = true;
              }
            }
            
            // Traverse up and make parent functions async
            let parent = path.getFunctionParent();
            while (parent) {
              parent.node.async = true;
              parent = parent.getFunctionParent();
            }
          }
        }
      }
    }
  });

  // 3. Import getDbAsync instead of getDb
  traverse(ast, {
    ObjectPattern(path) {
      if (path.parentPath.isVariableDeclarator() && path.parentPath.node.init && t.isCallExpression(path.parentPath.node.init) && path.parentPath.node.init.callee.name === 'require') {
        const arg = path.parentPath.node.init.arguments[0].value;
        if (arg === '../db/database' || arg === './db/database') {
          // Check if getDbAsync is already there
          const hasGetDbAsync = path.node.properties.some(p => p.key.name === 'getDbAsync');
          if (!hasGetDbAsync) {
            path.node.properties.push(t.objectProperty(t.identifier('getDbAsync'), t.identifier('getDbAsync'), false, true));
            modified = true;
          }
        }
      }
    }
  });

  if (modified) {
    const output = generator(ast, { retainLines: false }, code);
    fs.writeFileSync(filePath, output.code);
    console.log(`Transformed ${file}`);
  }
}
