const crypto = require('crypto');
const os = require('os');
const objectAssignDeep = require('object-assign-deep');

class CapitaliskApp {
  constructor({processStream}) {
    this.channel = null;
    this.options = {};
    this.appState = {
      modules: {}
    };
    this.nonce = crypto.randomBytes(8).toString('hex');
    this.os = os.platform() + os.release();
    this.processStream = processStream;
  }

  get alias() {
    return 'capitalisk_app';
  }

  get dependencies() {
    return [];
  }

  get events() {
    return ['ready', 'state:updated'];
  }

  get actions() {
    return {
      getApplicationState: {
        handler: async (action) => ({...this.appState})
      },
      updateApplicationState: {
        handler: async (action) => {
          this.updateAppState(action.params);
        }
      },
      getComponentConfig: {
        handler: (action) => this.options.components[action.params]
      },
      getModuleState: {
        handler: (action) => this.appState.modules[action.params.moduleName]
      },
      updateModuleState: {
        handler: (action) => {
          this.updateAppState({
            modules: {
              ...action.params
            }
          });
        }
      }
    };
  }

  updateAppState(newAppState) {
    objectAssignDeep(this.appState, newAppState);
    this.channel.publish('capitalisk_app:state:updated', this.appState);
  }

  async load(channel, options) {
    let mainNetworkConfig = this.appConfig.modules[options.moduleRedirects.network] || {};
    let mainHTTPAPIConfig = this.appConfig.modules[options.moduleRedirects.http_api] || {};
    this.channel = channel;
    this.options = options;
    this.appState = {
      ...options.nodeInfo,
      os: this.os,
      nonce: this.nonce,
      height: 1,
      wsPort: mainNetworkConfig.wsPort || options.defaultWSPort,
      httpPort: mainHTTPAPIConfig.httpPort || options.defaultHTTPPort,
      modules: {}
    };

    (async () => {
      for await (let [data] of this.processStream.listener('message')) {
        if (data && data.event === 'appReady') {
          this.channel.publish('capitalisk_app:ready');
          break;
        }
      }
    })();
  }

  async unload() {}
};

module.exports = CapitaliskApp;
