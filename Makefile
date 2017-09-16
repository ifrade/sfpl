.PHONY: test

# Install all dependencies
setup:
	@which yarn > /dev/null || (echo 'Please install yarn and make sure it is in your path'; exit 1)
	yarn install --ignore-engines

test:
	node_modules/mocha/bin/mocha test/*
