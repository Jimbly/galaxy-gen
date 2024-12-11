import assert from 'assert';
import { setStoragePrefix } from 'glov/client/local_storage';
import { DataObject } from 'glov/common/types';
import 'glov/server/test';

setStoragePrefix('mock');

class MockElementDebug {
}
let debug: MockElementDebug;

class MockLocation {
  protocol = 'mock';
  href = 'mock';
  host = 'localhostmock';
}

class MockDocument {
  getElementById(id: string): MockElementDebug {
    assert.equal(id, 'debug');
    if (!debug) {
      debug = new MockElementDebug();
    }
    return debug;
  }
  addEventListener(event: string, callback: () => void): void {
    // ignore
  }
  location = new MockLocation();
}

class MockNavigator {
  userAgent = 'Node.js/test';
  language = 'en-US';
  languages = ['en-US'];
  platform = process.platform;
}
let glob = global as DataObject;

assert(!glob.addEventListener);
glob.addEventListener = function () {
  // ignore
};
glob.conf_platform = 'web';
if (!glob.navigator) {
  glob.navigator = new MockNavigator();
} // else uses Node 22's built-in one
glob.BUILD_TIMESTAMP = String(Date.now());

assert(!glob.document);
let document = new MockDocument();
glob.document = document;
glob.location = document.location;
glob.window = glob;
