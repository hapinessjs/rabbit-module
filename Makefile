pretest:
	@node ./node_modules/.bin/tslint -p ./tsconfig.json --type-check "./src/**/*.ts" "./test/**/*.ts"
test:
	@node ./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha ./test
coveralls:
	cat ./coverage/lcov.info | node ./node_modules/.bin/coveralls
tsc:
	@node ./node_modules/.bin/tsc -p ./tsconfig.build.json
clean:
	@node ./node_modules/.bin/rimraf ./dist
packaging:
	@node ./node_modules/.bin/ts-node ./tools/packaging.ts
clean-dev:
	@node ./node_modules/.bin/rimraf ./dev
build-dev:
	@node ./node_modules/.bin/nodemon -q -e ts -w src -x "./node_modules/.bin/tslint -p ./tsconfig.dev.json --type-check \"./src/**/*.ts\" && ./node_modules/.bin/tsc -p ./tsconfig.dev.json || true"
run-dev:
	@node ./node_modules/.bin/nodemon -q -x "node ./dev/index.js || true"

.PHONY: pretest test coveralls tsc clean packaging clean-dev build-dev run-dev