# Toki Pona LLM API Translator / LLM API 道本语翻译器

nimi kepeken toki pona: *ilo ante kepeken kepeken ilo nasin pi ijo toki suli*

## 项目简介 / Project Introduction

这是一个使用LLM API高质量翻译自然语言↔道本语的Web应用程序。该项目采用多级解析架构，通过深度结构分析将中文文本精确转换为道本语，同时提供完整的道本语词典查询功能。

This is a web application that uses LLM APIs for high-quality translation between natural language and Toki Pona. The project employs a multi-level parsing architecture to accurately convert Chinese text into Toki Pona through deep structural analysis, while providing comprehensive Toki Pona dictionary lookup functionality.

## 主要特性 / Key Features

### 🔧 核心功能 / Core Functionality

- **多级解析架构**: 三级结构树解析（句子→成分→短语→最终翻译）
- **智能成分分析**: 自动识别主语、谓语、宾语、介词短语等句子成分
- **道本语词典**: 完整的道本语词汇表，支持搜索和高亮显示
- **LLM集成**: 支持DeepSeek等LLM API进行智能解析

### 🌐 技术特点 / Technical Features

- **Vue.js前端**: 使用Composition API构建响应式用户界面
- **模块化设计**: 分离的解析逻辑、字典管理和LLM交互模块
- **实时进度跟踪**: 解析过程实时显示进度和状态

## 项目结构 / Project Structure

```text
├── app.js                 # 主Vue应用 / Main Vue application
├── index.html            # 主页面 / Main HTML page
├── styles.css            # 样式文件 / Stylesheet
├── use_llm.js            # LLM API交互逻辑 / LLM API interaction logic
├── use_dictionary.js     # 字典管理逻辑 / Dictionary management logic
├── parse.js              # 解析函数和提示词 / Parsing functions and prompts
├── dictionary.csv        # 道本语词典数据 / Toki Pona dictionary data
├── helper.js             # 工具函数 / Utility functions
├── TODO.md               # 开发计划 / Development plan
└── draft/                # 草稿文件 / Draft files
    ├── context_free_grammar.txt
    └── translator_plan.md
```

## 安装和使用 / Installation and Usage

### 前置要求 / Prerequisites

- 现代浏览器（支持ES6模块）
- LLM API密钥（当前仅支持DeepSeek API）

### 快速开始 / Quick Start

1. **克隆项目**

   ```bash
   git clone https://github.com/MauritiusChief/Kepeken-ilo-nasin-Translator.git
   cd Kepeken-ilo-nasin-Translator
   ```

2. **配置API密钥**
   - 打开应用界面
   - 在API设置中输入您的DeepSeek API密钥
   - 设置API端点（默认[deepseek](https://api.deepseek.com/chat/completions)）

3. **开始翻译**
   - 在输入框中输入中文文本
   - 点击"解析"按钮开始一级结构树解析
   - 逐步点击转化按钮进行二级、三级结构树解析
   - 最终生成道本语翻译结果

## 解析流程 / Parsing Process

### 三级解析架构 / Three-Level Parsing Architecture

1. **一级结构树** - 句子级解析
   - 将段落拆分为独立句子
   - 识别语气助词、情景列、主语、谓语列

2. **二级结构树** - 成分级解析
   - 解析情景、谓语、宾语、介词宾语等成分
   - 分类为名词短语或动词短语

3. **三级结构树** - 短语级解析
   - 深度解析名词短语和动词短语结构
   - 处理从句和复合修饰词
   - 生成最终的道本语结构

## 字典功能 / Dictionary Features

- **完整词汇**: 包含所有官方道本语词汇及释义
- **智能搜索**: 支持道本语、中文翻译和释义的多字段搜索
- **实时高亮**: 搜索结果中高亮显示匹配内容
- **排序功能**: 按道本语词汇字母顺序排序

## 技术实现 / Technical Implementation

### 核心模块 / Core Modules

**useLLM()** - LLM交互管理

- API状态管理
- 多级解析流程控制
- 错误处理和重试机制
- 进度跟踪和计时

**useDictionary()** - 字典管理

- CSV数据加载和解析
- 搜索和过滤逻辑
- 结果高亮显示

**parse.js** - 解析引擎

- 段落解析 (parseParagraph)
- 句子解析 (parseSentence)
- 成分解析 (parseConstituents)
- 从句解析 (parseClause)
- 短语解析 (parsePhrases)

### 数据结构 / Data Structures

解析过程使用标准化的JSON结构：

```json
{
  "语气助词": "转折|祈使|呼唤|感叹|疑问",
  "情景列": ["情景1", "情景2"],
  "主语": "主语名词短语",
  "谓语列": [
    {
      "谓语": "谓语内容",
      "宾语列": ["宾语1", "宾语2"],
      "介词短语列": [
        {
          "介词": "工具/手段",
          "介词宾语": "介词宾语内容"
        }
      ]
    }
  ]
}
```

## 开发计划 / Development Plan

根据TODO.md，主要改进方向包括：

- [ ] 改进UI展示，不以纯JSON格式显示结构树
- [ ] 实现句子级独立发送和重试功能
- [ ] 增强成分分类的准确性
- [ ] 优化从句和短语的自动判断
- [ ] 完善名词短语并列处理逻辑

## 贡献指南 / Contributing

欢迎提交Issue和Pull Request来改进这个项目。主要贡献方向：

- 解析准确性的提升
- 用户界面的优化
- 新功能的添加
- 文档的完善

## 许可证 / License

本项目采用开源许可证，具体信息请查看项目根目录的LICENSE文件。

## 致谢 / Acknowledgments

- 感谢道本语社区的词汇和语法资源
- 感谢所有贡献者和用户的支持

---

最后：*ilo ni li pona tawa jan ale! (这个工具对所有人都有益！)*
