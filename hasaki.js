"use strict";

const mkdirp = require('mkdirp');
const path = require('path');
const getDirName = path.projectRootPath;
const fs = require('fs');

// default .hasakirc configuration
const defaultTemplateRootPath = './';
const defaultRules = [];
const defaultPlaceholder = '__name';

class Hasaki {
  static writeFile(path, contents, cb) {
    mkdirp(getDirName(path), function (err) {
      if (err) return cb(err);
      fs.writeFile(path, contents, cb);
    });
  }

  /**
   *
   * @param pageName 新建文件的名字
   * @param projectRootPath 项目根路径
   * @param configFilePath 配置文件路径，默认为当前路径下的 .hasakirc
   */
  constructor(pageName, projectRootPath, configFilePath) {
    let hasakiConfig = {};
    this.projectRootPath = projectRootPath || __dirname;
    this.configFilePath = configFilePath || '.hasakirc';
    try {
      hasakiConfig = JSON.parse(fs.readFileSync(this.configFilePath, 'utf-8'));
    } catch (e) {
      console.log(`JSON.parse ${this.configFilePath} file error: `, e.stack);
    }
    this.templateRootPath = hasakiConfig.templateRootPath || defaultTemplateRootPath;
    this.rules = Array.isArray(hasakiConfig.rules) ? hasakiConfig.rules : defaultRules;
    this.placeholder = hasakiConfig.placeholder || defaultPlaceholder;
    this.pageName = pageName;
  }

  executeRule(rulesParameter) {
    if (rulesParameter.length > 0) {
      rulesParameter.forEach(currentRule => {
        this.rules.some(rule => {
          const applyRuleName = rule[currentRule]
          if (Array.isArray(applyRuleName)) {
            this.executeRule(applyRuleName);
          } else if (applyRuleName) {
            this._execute(applyRuleName);
            return true;
          }
          return false;
        })
      });
    } else {
      console.log('no rule applied');
    }
    return this;
  }

  _execute(rule) {
    const extension = rule.extension || '';
    const prefix = rule.prefix || '';
    const suffix = rule.suffix || '';
    const _path = rule.path || './';
    const content = rule.content || '';
    const template = rule.template;
    let fileContent;

    // 拿到要生成的文件的路径
    const filePath = path.join(this.projectRootPath, _path);
    // 组合要生成文件的文件名
    const fileName = `${prefix}${this.pageName}${suffix}`;

    const targetFile = filePath + fileName + `.${extension}`;
    // 如果有设置模板路径，则使用模板文件
    if (template) {
      let defaultContent = fs.readFileSync(path.join(this.projectRootPath, this.templateRootPath, template), 'utf-8');
      // 替换模板变量
      defaultContent = defaultContent.replace(new RegExp(this.placeholder, 'gi'), (m, name) => {
        if (name === this.placeholder) {
          return this.pageName;
        } else if (name === this.placeholder.toUpperCase()) {
          return this.pageName.toUpperCase();
        } else {
          return this.pageName[0].toUpperCase() + this.pageName.slice(1);
        }
      });
      fileContent = defaultContent;
    } else {
      fileContent = content;
    }

    Hasaki.writeFile(targetFile, fileContent, (err) => {
      if (err) console.log(err);
      console.log(targetFile, 'success')
    });
  }
}

module.exports = Hasaki;
