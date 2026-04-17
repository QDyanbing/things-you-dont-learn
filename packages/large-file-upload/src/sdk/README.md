# FileCoordinator

`FileCoordinator` 是当前 SDK 的单文件基础类。

## Design

- 一个实例只处理一个文件
- 多文件场景由外层自己包一层管理
- 当前阶段只保留最基础的文件和配置存储能力

## Usage

```ts
import { FileCoordinator } from './FileCoordinator';

const coordinator = new FileCoordinator(file, {});
```

## API

### Constructor

```ts
new FileCoordinator(file, options)
```

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `file` | UI 选择后的单个文件对象 | `File` | - |
| `options` | 当前实例的配置项 | `FileCoordinatorOptions` | `{}` |

### FileCoordinatorOptions

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| - | 当前还没有正式开放配置项，后续会逐步补充 | - | - |

### Methods

| 方法 | 说明 | 返回类型 |
| --- | --- | --- |
| `getFile()` | 获取当前实例持有的原始文件对象 | `File` |
| `getOptions()` | 获取当前实例持有的配置对象 | `FileCoordinatorOptions` |
