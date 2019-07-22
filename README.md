# all-versions
[![NPM version][npm-image]][npm-url]

Checkout some/all versions at once in subdirs with index page

First sketchy version. No command-line arguments yet.

Just run in repo root and it creates build-site/$tag for each tag, and
"live" for what's in master.  And it writes build-site/index.html with
the change log and links.

Aborts if it can't safely do checkouts.

[npm-image]: https://img.shields.io/npm/v/all-versions.svg?style=flat-square
[npm-url]: https://npmjs.org/package/all-versions
