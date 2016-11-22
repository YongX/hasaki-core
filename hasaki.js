"use strict";

const mkdirp = require('mkdirp');
const path = require('path');
const getDirName = path.dirname;
const fs = require('fs');
const chalk = require('chalk');

// default .hasakirc configuration
const defaultTemplateRootPath = './';
const defaultRules = [];
const defaultPlaceholder = '__name';

const logError = function (text) {
  console.log(chalk.red.bold(text));
};

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
      logError(`JSON.parse ${this.configFilePath} file error: ${e.stack}`);
    }
    this.templateRootPath = hasakiConfig.templateRootPath || defaultTemplateRootPath;
    this.rules = Array.isArray(hasakiConfig.rules) ? hasakiConfig.rules : defaultRules;
    this.placeholder = hasakiConfig.placeholder || defaultPlaceholder;
    this.pageName = pageName;
    // rule fields
    this.suffixInRule = '';
    this.prefixInRule = '';
    this.extensionInRule = '';
    this.pathInRule = '';
    this.contentInRule = '';
    this.template = '';
    this.templates = '';
  }

  executeRule(rulesParameter) {
    if (rulesParameter.length > 0) {
      rulesParameter.forEach((currentRule) => {
        let findRule = false;
        this.rules.some(rule => {
          const applyRuleName = rule[currentRule];
          if (Array.isArray(applyRuleName)) {
            findRule = true;
            this.executeRule(applyRuleName);
          } else if (applyRuleName) {
            findRule = true;
            this._execute(applyRuleName);
            return true;
          } else {
            findRule = false;
          }
          return false;
        });
        if (!findRule) {
          logError(`${currentRule} not find in ${this.configFilePath}`);
        }
      });
    } else {
      logError('no rule applied');
    }
    return this;
  }

  _execute(rule) {
    this.extensionInRule = rule.extension || '';
    this.prefixInRule = rule.prefix || '';
    this.suffixInRule = rule.suffix || '';
    this.pathInRule = rule.path || './';
    this.contentInRule = rule.content || '';
    this.template = rule.template;
    this.templates = rule.templates || [];

    // 拿到要生成的文件的路径
    const filePath = path.join(this.projectRootPath, this.pathInRule);
    // 组合要生成文件的文件名
    const fileName = `${this.prefixInRule}${this.pageName}${this.suffixInRule}`;

    const targetFile = filePath + fileName + `.${this.extensionInRule}`;

    if (Array.isArray(this.templates) && this.templates.length > 0) {
      // 如果有指定templates，则忽略path配置和template的配置，按照templates指定的目录下的内容进行配置
      this.handleTemplates(this.templates, fileName);
    } else if (this.template) {
      // 如果有设置模板路径，则使用模板文件
      this.handleTemplate(targetFile, this.template);
    } else {
      this.handleContent(targetFile, this.contentInRule);
    }

  }

  handleContent(targetFile, content) {
    Hasaki.writeFile(targetFile, content, (err) => {
      if (err) logError(err);
      console.log(chalk.yellow.bold('  create file ') + chalk.cyan.bold(targetFile) + chalk.yellow.bold(' success'));
    });
  }

  handleTemplate(targetFile, template) {
    let templateContent = '';
    const templateFilePath = path.join(this.projectRootPath, this.templateRootPath, template);
    if (fs.existsSync(templateFilePath)) {
      templateContent = fs.readFileSync(templateFilePath, 'utf-8');
      // 替换模板变量
      templateContent = this.replaceContentWithPlaceholder(templateContent);
    } else {
      logError(`template ${templateFilePath} doesn\'t exist.`);
    }

    Hasaki.writeFile(targetFile, templateContent, (err) => {
      if (err) logError(err);
      console.log(chalk.yellow.bold('  create file ') + chalk.cyan.bold(targetFile) + chalk.yellow.bold(' success'));
    });
  }

  replaceContentWithPlaceholder(templateContent) {
    return templateContent.replace(new RegExp(this.placeholder, 'gi'), (m, name) => {
      if (name === this.placeholder) {
        return this.pageName;
      } else if (name === this.placeholder.toUpperCase()) {
        return this.pageName.toUpperCase();
      } else {
        return this.pageName[0].toUpperCase() + this.pageName.slice(1);
      }
    });
  }

  handleTemplates(templates, fileName) {
    const _walkAndWriteFile = function (template) {
      let targetFile;
      if (fs.existsSync(template)) {
        const fileType = fs.statSync(template);
        if (fileType.isDirectory()) {
          // this._parentPath = path.join(this._parentPath, template);
          // console.log(template);

          fs.readdirSync(template).map(file => _walkAndWriteFile.call(this, path.join(template, file)));
        } else if (fileType.isFile()) {
          let tempName = template.split('/').pop();
          let content = fs.readFileSync(template, 'utf-8');
          if (this._parentPath) {
            if (!this.keepFileName) {
              // 不保留原来目录的名字
              tempName = this.replaceContentWithPlaceholder(tempName);
            }
            targetFile = path.join(this._parentPath, this.pageName, tempName);
            if (this.usePlaceholder) {
              content = this.replaceContentWithPlaceholder(content);
            }
          } else {
            const fileExtension = tempName.split('.').pop();
            targetFile = path.join(template, '../', fileName + '.' + fileExtension);
          }
          // Hasaki.writeFile(targetFile, content);
          // console.log(targetFile);
        } else {
          logError(`${template}: Invalid file type.`)
        }
      } else {
        logError(template + ' not found');
      }
    };
    const _analysisTemplate = function (temp) {
      if (fs.existsSync(temp)) {
        const fileType = fs.statSync(temp);
        if (fileType.isDirectory()) {
          // 如果是一个文件的路径
          this._parentPath = temp.substr(0, temp.lastIndexOf('/'));
        } else {
          this._parentPath = '';
        }
      }
      _walkAndWriteFile.call(this, temp);
    };
    templates.forEach(template => {
      const pathType = Object.prototype.toString.call(template);
      if (pathType === '[object String]') {
        // 若为字符串，则直接看做目录
        this.usePlaceholder = false;
        _analysisTemplate.call(this, template);
      } else if (pathType === '[object Object]') {
        this.placeholder = template.placeholder || '';
        this.keepFileName = template.keepFileName || true;
        this.usePlaceholder = true;
        _analysisTemplate.call(this, template.source);
      }
    });
  }
}

module.exports = Hasaki;
