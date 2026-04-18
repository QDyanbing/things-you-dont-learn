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
| `chunkSize` | 单个分片的字节大小 | `number` | `5 * 1024 * 1024` |

### FileCoordinatorStatus

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `INIT` | 当前实例创建完成后的初始状态 | `'INIT'` | - |
| `PREPARING` | 进入预处理阶段，例如切片、hash、恢复本地记录等 | `'PREPARING'` | - |
| `READY` | 预处理完成，已经可以开始上传 | `'READY'` | - |
| `UPLOADING` | 正在上传文件分片 | `'UPLOADING'` | - |
| `PAUSED` | 上传已被暂停，等待继续 | `'PAUSED'` | - |
| `COMPLETING` | 分片上传完成，正在做最终完成步骤 | `'COMPLETING'` | - |
| `COMPLETED` | 上传流程已经全部完成 | `'COMPLETED'` | - |
| `CANCELED` | 上传已被主动取消 | `'CANCELED'` | - |
| `ERROR` | 上传流程发生错误 | `'ERROR'` | - |

### Methods

| 方法 | 说明 | 返回类型 |
| --- | --- | --- |
| `getFile()` | 获取当前实例持有的原始文件对象 | `File` |
| `getOptions()` | 获取当前实例持有的配置对象 | `FileCoordinatorOptions` |
| `getStatus()` | 获取当前实例状态 | `FileCoordinatorStatus` |
| `getChunkCount()` | 获取当前文件分片数量 | `number` |
