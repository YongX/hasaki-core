## hasaki core

hasaki 项目文件读写功能核心代码，可以使用 node 来单独使用。

## 用法
```
// node version >= v5.8.0

var Hasaki = require('hasaki');

var rulesParameter = ['rule3'];
var pageName = 'home';

var hasaki = new Hasaki(pageName);
Hasaki.executeRule(rulesParameter);
```

## 注意
确保提供给 `executeRule` 方法的参数里面的内容在 `.hasakirc` 有对应的配置项

