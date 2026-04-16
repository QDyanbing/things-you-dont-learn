import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Input,
  InputNumber,
  List,
  Progress,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  createUploadApiClientOptions,
} from '../api/uploads';
import {
  clearDemoSession,
  createDemoSession,
  refreshDemoAccessToken,
} from '../api/demoAuth';
import {
  createPartSizePresetResolver,
  createDemoUploadAdapter,
  getUploadPartSizePreset,
  LargeFileUploader,
  PART_SIZE_UNITS,
  recommendPartSize,
  UPLOAD_PART_SIZE_PRESETS,
  type DemoUploadResult,
  type DemoUploadServerContext,
  type UploadSnapshot,
} from '../utils/large-file-upload';

const DEFAULT_PART_SIZE_MB = 5;
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_AUTH_TOKEN = 'demo-access-token';
const EXPIRED_DEMO_AUTH_TOKEN = 'expired-demo-token';

type AuthMode = 'none' | 'bearer' | 'cookie';
type PartSizeMode = 'custom' | 'balanced' | 'throughput' | 'recovery';

/**
 * Human-readable byte formatter shared across progress cards and list items.
 */
function formatBytes(bytes: number) {
  if (bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 100 || index === 0 ? 0 : 2)} ${units[index]}`;
}

/**
 * Formats the estimated remaining time reported by the uploader snapshot.
 */
function formatDuration(ms: number | null) {
  if (!ms || ms <= 0) {
    return '-';
  }

  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

/**
 * Maps uploader status to antd tag colors so the badge stays visually consistent.
 */
function getStatusTagColor(status: UploadSnapshot['status']) {
  switch (status) {
    case 'completed':
      return 'success';
    case 'uploading':
      return 'processing';
    case 'paused':
      return 'warning';
    case 'error':
      return 'error';
    case 'canceled':
      return 'default';
    default:
      return 'blue';
  }
}

/**
 * Derives a pending chunk size directly from the current file and part number.
 */
function getPendingPartSize(file: File | null, partNumber: number, partSize: number) {
  if (!file) {
    return 0;
  }

  const start = (partNumber - 1) * partSize;
  const end = Math.min(file.size, start + partSize);
  return Math.max(0, end - start);
}

function createInitialSnapshot(
  partSize: number,
): UploadSnapshot<DemoUploadResult, DemoUploadServerContext> {
  return {
    status: 'idle',
    partSize,
    totalParts: 0,
    uploadedPartNumbers: [],
    pendingPartNumbers: [],
    completedParts: [],
    progress: {
      hashingPercent: 0,
      uploadPercent: 0,
      overallPercent: 0,
      uploadedBytes: 0,
      confirmedUploadedBytes: 0,
      totalBytes: 0,
      speedBps: 0,
      remainingBytes: 0,
      estimatedRemainingMs: null,
    },
    flags: {
      resumedFromCheckpoint: false,
      resumedFromRemote: false,
      instantUpload: false,
    },
  };
}

function resolvePartSizeStrategy(mode: PartSizeMode) {
  switch (mode) {
    case 'balanced':
    case 'throughput':
    case 'recovery': {
      const preset = getUploadPartSizePreset(mode);
      return {
        description: preset.description,
        recommend: (fileSize: number) => recommendPartSize(fileSize, preset),
        resolver: createPartSizePresetResolver(mode),
      };
    }
    default:
      return {
        description: '固定分片大小，适合后端已有明确 multipart 限制。',
        recommend: undefined,
        resolver: undefined,
      };
  }
}

function getAuthModeDescription(authMode: AuthMode, authToken: string) {
  switch (authMode) {
    case 'bearer':
      return authToken.trim()
        ? '请求会自动注入 Authorization Bearer Token。'
        : '当前是 Bearer 模式，但还没有填写 token。';
    case 'cookie':
      return '请求会以 credentials=include 的方式携带 Cookie / Session。';
    default:
      return '请求不会额外注入登录态信息。';
  }
}

export function LargeFileUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [partSizeMb, setPartSizeMb] = useState(DEFAULT_PART_SIZE_MB);
  const [partSizeMode, setPartSizeMode] = useState<PartSizeMode>('balanced');
  const [concurrency, setConcurrency] = useState(DEFAULT_CONCURRENCY);
  const [authMode, setAuthMode] = useState<AuthMode>('none');
  const [authToken, setAuthToken] = useState(DEFAULT_AUTH_TOKEN);
  const [autoRefreshToken, setAutoRefreshToken] = useState(true);
  const configuredPartSize = partSizeMb * PART_SIZE_UNITS.MB;
  const partSizeStrategy = resolvePartSizeStrategy(partSizeMode);
  const [snapshot, setSnapshot] = useState<UploadSnapshot<DemoUploadResult, DemoUploadServerContext>>(
    createInitialSnapshot(configuredPartSize),
  );
  const [apiMessage, setApiMessage] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const uploaderRef = useRef<LargeFileUploader<DemoUploadServerContext, DemoUploadResult> | null>(null);
  const effectivePartSize = selectedFile
    ? partSizeStrategy.recommend?.(selectedFile.size) ?? configuredPartSize
    : configuredPartSize;
  const estimatedChunkCount = selectedFile
    ? Math.max(1, Math.ceil(selectedFile.size / effectivePartSize))
    : 0;

  useEffect(() => {
    let disposed = false;
    const currentPartSizeStrategy = resolvePartSizeStrategy(partSizeMode);
    const apiClientOptions = createUploadApiClientOptions({
      auth:
        authMode === 'bearer'
          ? {
              type: 'bearer',
              token: authToken.trim(),
              credentials: 'omit',
            }
          : authMode === 'cookie'
            ? {
                type: 'cookie',
              }
            : {
                type: 'none',
                credentials: 'omit',
              },
      headers: {
        'x-demo-upload-access': authMode === 'none' ? 'public' : authMode,
      },
      onUnauthorized: async () => {
        if (authMode === 'bearer' && autoRefreshToken) {
          const nextToken = await refreshDemoAccessToken();
          if (!disposed) {
            setAuthToken(nextToken);
            setApiMessage('Bearer Token 已自动刷新，上传请求会自动重试一次。');
          }
          return true;
        }

        setApiMessage(
          authMode === 'cookie'
            ? '请求返回 401。当前是 Cookie 模式，请先点击“写入演示 Session”。'
            : '请求返回 401。这里可以接 refresh token 逻辑，成功后返回 true 即可自动重试一次。',
        );
        return false;
      },
    });

    // Re-create the uploader whenever transport-level configuration changes so
    // the class instance always matches the current page controls.
    const uploader = new LargeFileUploader<DemoUploadServerContext, DemoUploadResult>({
      adapter: createDemoUploadAdapter({
        apiClientOptions,
      }),
      partSize: configuredPartSize,
      partSizeResolver: currentPartSizeStrategy.resolver,
      concurrency,
      retry: {
        maxAttempts: 4,
        baseDelayMs: 800,
      },
    });

    uploaderRef.current = uploader;
    setSnapshot(uploader.getSnapshot() ?? createInitialSnapshot(configuredPartSize));

    const unsubscribeSnapshot = uploader.on('snapshot', (nextSnapshot) => {
      if (disposed) {
        return;
      }

      setSnapshot(nextSnapshot);
      if (nextSnapshot.result?.fileUrl) {
        setResultUrl(nextSnapshot.result.fileUrl);
      }
    });

    if (selectedFile) {
      // Preparing eagerly keeps the "start upload" interaction lightweight and
      // lets the page show hash/checkpoint progress immediately after selection.
      setApiMessage('正在进行文件预处理与哈希计算...');
      setResultUrl('');
      void uploader
        .prepare(selectedFile)
        .then((nextSnapshot) => {
          if (disposed) {
            return;
          }

          if (nextSnapshot.flags.resumedFromCheckpoint) {
            setApiMessage('已读取本地断点记录，可以开始上传或继续续传。');
            return;
          }

          setApiMessage('文件预处理完成，可以开始上传。');
        })
        .catch((error: unknown) => {
          if (disposed) {
            return;
          }

          const errorMessage = error instanceof Error ? error.message : '文件预处理失败';
          setApiMessage(errorMessage);
          message.error(errorMessage);
        });
    } else {
      setApiMessage('');
      setResultUrl('');
    }

    return () => {
      disposed = true;
      unsubscribeSnapshot();
      uploader.destroy();
    };
  }, [authMode, authToken, autoRefreshToken, configuredPartSize, concurrency, partSizeMode, selectedFile]);

  const beforeUpload = async (file: File) => {
    setSelectedFile(file);
    return false;
  };

  const startUpload = async () => {
    if (!uploaderRef.current || !selectedFile) {
      message.warning('请先选择文件');
      return;
    }

    setApiMessage('正在创建上传任务并上传分片...');

    try {
      const result = await uploaderRef.current.start();
      const nextSnapshot = uploaderRef.current.getSnapshot();

      if (nextSnapshot.flags.instantUpload) {
        setApiMessage('服务端已识别为秒传，当前文件直接命中已上传结果。');
      } else if (nextSnapshot.flags.resumedFromRemote) {
        setApiMessage('检测到服务端已有上传进度，已按断点续传继续。');
      } else {
        setApiMessage('文件已上传完成。');
      }

      if (result?.fileUrl) {
        setResultUrl(result.fileUrl);
      }

      message.success('上传完成');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      setApiMessage(errorMessage);
      message.error(errorMessage);
    }
  };

  const pauseUpload = async () => {
    if (!uploaderRef.current) {
      return;
    }

    await uploaderRef.current.pause();
    setApiMessage('上传已暂停，可继续恢复。');
  };

  const resumeUpload = async () => {
    if (!uploaderRef.current) {
      return;
    }

    setApiMessage('继续上传中...');

    try {
      const result = await uploaderRef.current.resume();
      const nextSnapshot = uploaderRef.current.getSnapshot();

      if (nextSnapshot.flags.instantUpload) {
        setApiMessage('服务端已识别为秒传，当前文件直接命中已上传结果。');
      } else {
        setApiMessage('文件已上传完成。');
      }

      if (result?.fileUrl) {
        setResultUrl(result.fileUrl);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '继续上传失败';
      setApiMessage(errorMessage);
      message.error(errorMessage);
    }
  };

  const resetSelection = async () => {
    if (
      uploaderRef.current
      && selectedFile
      && snapshot.status !== 'idle'
      && snapshot.status !== 'completed'
      && snapshot.status !== 'canceled'
    ) {
      await uploaderRef.current.cancel({
        removeCheckpoint: true,
      });
    }

    setSelectedFile(null);
    setSnapshot(createInitialSnapshot(configuredPartSize));
    setApiMessage('');
    setResultUrl('');
  };

  const retryUpload = async () => {
    if (!uploaderRef.current) {
      return;
    }

    setApiMessage('正在重试上传...');

    try {
      const result = await uploaderRef.current.retry();
      if (result?.fileUrl) {
        setResultUrl(result.fileUrl);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '重试上传失败';
      setApiMessage(errorMessage);
      message.error(errorMessage);
    }
  };

  const restartUpload = async () => {
    if (!uploaderRef.current || !selectedFile) {
      message.warning('请先选择文件');
      return;
    }

    setApiMessage('正在清理旧上传状态并重新开始...');

    try {
      const result = await uploaderRef.current.restart({
        removeCheckpoint: true,
      });
      if (result?.fileUrl) {
        setResultUrl(result.fileUrl);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '重新上传失败';
      setApiMessage(errorMessage);
      message.error(errorMessage);
    }
  };

  const prepareDemoCookieSession = async () => {
    try {
      await createDemoSession();
      setApiMessage('演示 Session 已写入，Cookie 模式下可以直接上传。');
      message.success('已写入演示 Session');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '写入演示 Session 失败';
      setApiMessage(errorMessage);
      message.error(errorMessage);
    }
  };

  const removeDemoCookieSession = async () => {
    try {
      await clearDemoSession();
      setApiMessage('演示 Session 已清除。');
      message.success('已清除演示 Session');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '清除演示 Session 失败';
      setApiMessage(errorMessage);
      message.error(errorMessage);
    }
  };

  const canChangeConfig = !selectedFile;
  const uploadProgressStatus = snapshot.status === 'completed' ? 'success' : snapshot.status === 'error' ? 'exception' : 'active';
  const pendingParts = snapshot.pendingPartNumbers.slice(0, 20).map((partNumber) => ({
    partNumber,
    size: getPendingPartSize(selectedFile, partNumber, snapshot.partSize),
  }));

  return (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      {/* Configuration controls are intentionally separated from live status so
          the user can understand which values are locked after a file is chosen. */}
      <Card title="上传参数配置">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Typography.Text>选择文件</Typography.Text>
              <Upload beforeUpload={beforeUpload} maxCount={1} showUploadList={false} disabled={snapshot.status === 'uploading'}>
                <Button type="primary" disabled={snapshot.status === 'uploading'}>
                  选择文件
                </Button>
              </Upload>
              {selectedFile ? (
                <Alert
                  type="info"
                  showIcon
                  message={`当前文件：${selectedFile.name}`}
                  description={`大小：${formatBytes(selectedFile.size)}`}
                />
              ) : null}
            </Space>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text>鉴权模式</Typography.Text>
            <Select<AuthMode>
              options={[
                { label: '不鉴权', value: 'none' },
                { label: 'Bearer Token', value: 'bearer' },
                { label: 'Cookie / Session', value: 'cookie' },
              ]}
              value={authMode}
              onChange={(value) => setAuthMode(value)}
              style={{ width: '100%' }}
              disabled={!canChangeConfig}
            />
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text>并发数</Typography.Text>
            <InputNumber
              min={1}
              max={8}
              value={concurrency}
              onChange={(value) => setConcurrency(value ?? DEFAULT_CONCURRENCY)}
              style={{ width: '100%' }}
              disabled={!canChangeConfig}
            />
          </Col>
          <Col xs={24}>
            <Typography.Text>Token / 登录态说明</Typography.Text>
            <Input
              allowClear
              placeholder="Bearer 模式下可填写 access token"
              value={authToken}
              onChange={(event) => setAuthToken(event.target.value)}
              disabled={!canChangeConfig || authMode !== 'bearer'}
            />
            <Alert
              style={{ marginTop: 12 }}
              type={authMode === 'bearer' && !authToken.trim() ? 'warning' : 'info'}
              showIcon
              message={getAuthModeDescription(authMode, authToken)}
              description="当前 demo 会把 x-demo-upload-access 一起发给服务端，用来模拟公开、Bearer、Cookie 三种上传场景。"
            />
            {authMode === 'bearer' ? (
              <Space wrap style={{ marginTop: 12 }}>
                <Button onClick={() => setAuthToken(DEFAULT_AUTH_TOKEN)} disabled={!canChangeConfig}>
                  填入有效 Token
                </Button>
                <Button onClick={() => setAuthToken(EXPIRED_DEMO_AUTH_TOKEN)} disabled={!canChangeConfig}>
                  填入过期 Token
                </Button>
                <Button
                  type={autoRefreshToken ? 'primary' : 'default'}
                  onClick={() => setAutoRefreshToken((value) => !value)}
                  disabled={!canChangeConfig}
                >
                  自动刷新：{autoRefreshToken ? '开启' : '关闭'}
                </Button>
              </Space>
            ) : null}
            {authMode === 'cookie' ? (
              <Space wrap style={{ marginTop: 12 }}>
                <Button onClick={() => void prepareDemoCookieSession()} disabled={!canChangeConfig}>
                  写入演示 Session
                </Button>
                <Button onClick={() => void removeDemoCookieSession()} disabled={!canChangeConfig}>
                  清除演示 Session
                </Button>
              </Space>
            ) : null}
          </Col>
          <Col xs={24}>
            <Typography.Text>分片策略</Typography.Text>
            <Segmented<PartSizeMode>
              block
              options={[
                { label: '固定分片', value: 'custom' },
                { label: UPLOAD_PART_SIZE_PRESETS.balanced.label, value: 'balanced' },
                { label: UPLOAD_PART_SIZE_PRESETS.throughput.label, value: 'throughput' },
                { label: UPLOAD_PART_SIZE_PRESETS.recovery.label, value: 'recovery' },
              ]}
              value={partSizeMode}
              onChange={(value) => setPartSizeMode(value)}
              disabled={!canChangeConfig}
            />
            <Alert
              style={{ marginTop: 12 }}
              type="info"
              showIcon
              message={partSizeStrategy.description}
              description={
                selectedFile
                  ? `当前文件预计使用 ${formatBytes(effectivePartSize)} 分片，约 ${estimatedChunkCount} 个分片。`
                  : '选择文件后会显示该文件的预计生效分片大小和分片数。'
              }
            />
          </Col>
          <Col xs={24} md={12}>
            <Typography.Text>分片大小（MB）</Typography.Text>
            <InputNumber
              min={1}
              max={50}
              value={partSizeMb}
              onChange={(value) => setPartSizeMb(value ?? DEFAULT_PART_SIZE_MB)}
              style={{ width: '100%' }}
              disabled={!canChangeConfig || partSizeMode !== 'custom'}
            />
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text>预计生效分片大小</Typography.Text>
            <Alert type="success" showIcon message={formatBytes(effectivePartSize)} />
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text>预计分片数</Typography.Text>
            <Alert type="success" showIcon message={selectedFile ? `${estimatedChunkCount} 个` : '-'} />
          </Col>
        </Row>

        <Divider />

        <Space wrap>
          <Button
            type="primary"
            onClick={() => void startUpload()}
            disabled={!selectedFile || snapshot.status === 'hashing' || snapshot.status === 'uploading'}
          >
            开始上传
          </Button>
          <Button onClick={() => void pauseUpload()} disabled={snapshot.status !== 'uploading'}>
            暂停上传
          </Button>
          <Button onClick={() => void resumeUpload()} disabled={snapshot.status !== 'paused'}>
            继续上传
          </Button>
          <Button onClick={() => void retryUpload()} disabled={!['error', 'paused', 'ready'].includes(snapshot.status)}>
            失败重试
          </Button>
          <Button onClick={() => void restartUpload()} disabled={!selectedFile || snapshot.status === 'uploading'}>
            重新上传
          </Button>
          <Button onClick={() => void resetSelection()} disabled={snapshot.status === 'uploading'}>
            清空当前文件
          </Button>
          <Tag color={getStatusTagColor(snapshot.status)}>状态：{snapshot.status}</Tag>
          {snapshot.flags.resumedFromCheckpoint ? <Tag color="gold">本地断点</Tag> : null}
          {snapshot.flags.resumedFromRemote ? <Tag color="cyan">服务端续传</Tag> : null}
          {snapshot.flags.instantUpload ? <Tag color="success">秒传命中</Tag> : null}
        </Space>
      </Card>

      {/* Progress is broken into hash, upload, and overall stages so the page
          can explain why "0% uploading" may still mean preprocessing is active. */}
      <Card title="上传进度">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={6}>
            <Statistic title="总分片数" value={snapshot.totalParts} />
          </Col>
          <Col xs={24} md={6}>
            <Statistic title="已完成分片" value={snapshot.uploadedPartNumbers.length} />
          </Col>
          <Col xs={24} md={6}>
            <Statistic title="整体进度" value={snapshot.progress.overallPercent} suffix="%" precision={2} />
          </Col>
          <Col xs={24} md={6}>
            <Statistic title="上传速度" value={formatBytes(snapshot.progress.speedBps)} suffix="/s" />
          </Col>
        </Row>
        <Divider />
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <Typography.Text>文件预处理 / 哈希进度</Typography.Text>
            <Progress percent={snapshot.progress.hashingPercent} size="small" />
          </div>
          <div>
            <Typography.Text>分片上传进度</Typography.Text>
            <Progress percent={snapshot.progress.uploadPercent} status={uploadProgressStatus} />
          </div>
          <div>
            <Typography.Text>综合进度</Typography.Text>
            <Progress percent={snapshot.progress.overallPercent} status={uploadProgressStatus} />
          </div>
        </Space>
        <Divider />
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="已上传字节">{formatBytes(snapshot.progress.uploadedBytes)}</Descriptions.Item>
          <Descriptions.Item label="待上传字节">{formatBytes(snapshot.progress.remainingBytes)}</Descriptions.Item>
          <Descriptions.Item label="确认完成字节">{formatBytes(snapshot.progress.confirmedUploadedBytes)}</Descriptions.Item>
          <Descriptions.Item label="预计剩余时间">{formatDuration(snapshot.progress.estimatedRemainingMs)}</Descriptions.Item>
        </Descriptions>
        {apiMessage ? <Alert style={{ marginTop: 16 }} type="info" showIcon message={apiMessage} /> : null}
        {resultUrl ? (
          <Alert style={{ marginTop: 16 }} type="success" showIcon message={`处理结果地址：${resultUrl}`} />
        ) : null}
      </Card>

      {/* Raw task metadata is useful when pairing the demo UI with backend logs. */}
      <Card title="上传任务信息">
        {selectedFile ? (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="uploadId">{snapshot.uploadId ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="fileHash">{snapshot.fileHash ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="分片大小">{formatBytes(snapshot.partSize)}</Descriptions.Item>
            <Descriptions.Item label="并发数">{concurrency}</Descriptions.Item>
            <Descriptions.Item label="已上传分片">{snapshot.uploadedPartNumbers.join(', ') || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">{snapshot.status}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Alert type="warning" showIcon message="还没有上传任务，请先选择文件。" />
        )}
      </Card>

      {/* Keeping a short pending chunk list helps visualize how part splitting works. */}
      <Card title="待上传分片">
        <List
          size="small"
          bordered
          dataSource={pendingParts}
          locale={{ emptyText: '当前没有待上传分片' }}
          renderItem={(item) => (
            <List.Item>
              分片 #{item.partNumber} / {snapshot.totalParts} - {formatBytes(item.size)}
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );
}
