// Replaces 0.0.0-stub versions with real versions from packages-versions.json
// Runs in the public GitHub repo before build/publish
const fs = require('fs');
const path = require('path');

const versionsPath = path.resolve(process.cwd(), 'packages-versions.json');
const versions = JSON.parse(fs.readFileSync(versionsPath, 'utf-8'));

function updatePackage(pkgDir) {
  const pkgPath = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  let changed = false;

  if (pkg.version === '0.0.0-stub') {
    const version = versions[pkg.name];
    if (!version) throw new Error(`Version for "${pkg.name}" not found in packages-versions.json`);
    pkg.version = version;
    changed = true;
  }

  for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (!pkg[field]) continue;
    for (const [name, ver] of Object.entries(pkg[field])) {
      if (ver === '0.0.0-stub') {
        const version = versions[name];
        if (!version) throw new Error(`Version for dependency "${name}" not found in packages-versions.json`);
        pkg[field][name] = version;
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    console.log(`Updated ${pkg.name}@${pkg.version}`);
  }
}

for (const baseDir of ['libs', 'packages']) {
  const dir = path.resolve(process.cwd(), baseDir);
  if (!fs.existsSync(dir)) continue;
  for (const entry of fs.readdirSync(dir)) {
    updatePackage(path.join(dir, entry));
  }
}
