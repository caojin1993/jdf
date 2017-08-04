"use strict";

const jdf = require('../jdf');
const VFS = require('../VFS/VirtualFileSystem');
const jdfUtils = require('jdf-utils');
const $ = jdfUtils.base;
const logger = require('jdf-log');


const core = module.exports = {};

core.plugins = [];
core.pluginsInstance = {};  // require缓存

core.isAddedFromConfiguration = false;

// 增加plugin
core.addPlugin = function (pluginName) {
    if ($.isArray(pluginName)) {
        this.plugins = this.plugins.concat(pluginName)
    } else {
        this.plugins.push(pluginName);
    }
};

core.addPluginFromConfiguration = function () {
    if (this.isAddedFromConfiguration) {
        logger.verbose(`have added the plugin to system`);
        return;
    }
    this.addPlugin(jdf.config.plugins);
    this.isAddedFromConfiguration = true;
};

core.require = function (pluginObj) {
    let moduleName
    if (typeof pluginObj === 'string') {
        moduleName = pluginObj
        pluginObj = {name: moduleName}
    } else {
        moduleName = pluginObj.name
    }

    if (this.pluginsInstance[moduleName]) {
        return this.pluginsInstance[moduleName];
    } else {
        let plugin = require(moduleName).Plugin();
        // let plugin
        // if (moduleName === 'jdf-cms') {
        //     plugin = require("D:/JDCProject/JDC_arch_cmstool/gitsource/JDC_arch_cmstool").Plugin();
        // } else if (moduleName === 'jdf-extract-template') {
        //     plugin = require("D:/JDCProject/JDF_plugin/gitsource/jdf-extract-template").Plugin();
        // }
        plugin.setConfig({
            VFS: VFS,
            jdf: jdf,
            pluginConfig: pluginObj
        });
        this.pluginsInstance[moduleName] = plugin
        return plugin
    }
};

// 删除plugin
core.deletePlugin = function (pluginName) {
    this.plugins = this.plugins.filter(function (name) {
        return pluginName !== name
    });
};

core.excuteBeforeBuild = function () {
    let all = [];
    try {
        this.plugins.forEach(function (pluginObj) {
            let pluginName
            if (typeof pluginObj === 'string') {
                pluginName = pluginObj
            } else {
                pluginName = pluginObj.name
            }

            logger.verbose(`excute plugin ${pluginName} -> before build`);

            let plugin = core.require(pluginObj);

            if (typeof plugin.beforeBuild === 'function') {
                // plugin的执行环境需要切换到工程跟目录，遇到问题再改
                all.push(plugin.beforeBuild());
            }
            else {
                // TODO 配置编译前编译后的开关
                logger.warn(`插件${pluginName}没有beforeBuild方法`);
            }
        });
        return all;
    } catch (error) {
        return Promise.reject(error);
    }
}

core.excuteAfterBuild = function () {
    let all = [];
    try {
        this.plugins.forEach(function (pluginName) {
            logger.verbose(`excute plugin ${pluginName} -> after build`);

            let plugin = core.require(pluginName);

            if (typeof plugin.afterBuild === 'function') {
                // plugin的执行环境需要切换到工程跟目录，遇到问题再改
                all.push(plugin.afterBuild());
            }
            else {
                // TODO 配置编译前编译后的开关
                logger.warn(`插件${pluginName}没有afterBuild方法`);
            }
        });
        return all;
    } catch (error) {
        return Promise.reject(error);
    }
}

// 模板编译前
core.excuteBeforeTplRender = function (tpl, widgetInfo) {
    let result = tpl;
    this.plugins.forEach(function (pluginName) {
        let plugin = core.require(pluginName);
        if (typeof plugin.beforeTplRender === 'function') {
            result = plugin.beforeTplRender(result, widgetInfo);
        }
        else {
            logger.warn(`插件${pluginName}没有beforeTplRender方法`);
        }
    });
    return result;
}

// 模板插入html前
core.excuteBeforeTplInsert = function (tpl, widgetInfo) {
    let result = tpl;
    this.plugins.forEach(function (pluginName) {
        let plugin = core.require(pluginName);
        if (typeof plugin.beforeTplInsert === 'function') {
            result = plugin.beforeTplInsert(result, widgetInfo);
        }
        else {
            logger.warn(`插件${pluginName}没有beforeTplInsert方法`);
        }
    });
    return result;
}