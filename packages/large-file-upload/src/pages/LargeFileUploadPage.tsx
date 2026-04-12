import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  InputNumber,
  List,
  Progress,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  completeUpload,
  createUpload,
  getUpload,
  getUploadParts,
  putUploadPart,
  type UploadDto,
} from '../api/uploads';

const DEFAULT_PART_SIZE_MB = 5;
const DEFAULT_CONCURRENCY = 3;

interface FilePart {
  partNumber: number;
  size: number;
  partHash: string;
}

type UploadStatus = 'idle' | 'hashing' | 'ready' | 'uploading' | 'paused' | 'completed';

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function hashText(text: string) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function buildFileHash(file: File) {
  return hashText(`${file.name}:${file.size}:${file.lastModified}`);
}

function createParts(file: File, partSize: number): FilePart[] {
  const parts: FilePart[] = [];
  let offset = 0;
  let index = 0;

  while (offset < file.size) {
    const end = Math.min(offset + partSize, file.size);
    parts.push({
      partNumber: index + 1,
      size: end - offset,
      partHash: `${file.name}-${index + 1}-${end - offset}`,
    });
    offset = end;
    index += 1;
  }

  return parts;
}

export function LargeFileUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState('');
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [partSizeMb, setPartSizeMb] = useState(DEFAULT_PART_SIZE_MB);
  const [concurrency, setConcurrency] = useState(DEFAULT_CONCURRENCY);
  const [upload, setUpload] = useState<UploadDto | null>(null);
  const [uploadedPartNumbers, setUploadedPartNumbers] = useState<number[]>([]);
  const [resultUrl, setResultUrl] = useState('');
  const [apiMessage, setApiMessage] = useState('');
  const pauseRef = useRef(false);

  const partSize = useMemo(() => partSizeMb * 1024 * 1024, [partSizeMb]);
  const parts = useMemo(() => {
    if (!selectedFile) {
      return [];
    }
    return createParts(selectedFile, partSize);
  }, [selectedFile, partSize]);

  const pendingParts = useMemo(
    () => parts.filter((part) => !uploadedPartNumbers.includes(part.partNumber)),
    [parts, uploadedPartNumbers],
  );

  const beforeUpload = async (file: File) => {
    setSelectedFile(file);
    setStatus('hashing');
    setApiMessage('');
    setResultUrl('');
    setUpload(null);
    setUploadedPartNumbers([]);

    const nextFileHash = await buildFileHash(file);
    setFileHash(nextFileHash);
    setStatus('ready');
    return false;
  };

  const syncUpload = async (uploadId: string) => {
    const [uploadResponse, partsResponse] = await Promise.all([
      getUpload(uploadId),
      getUploadParts(uploadId),
    ]);

    setUpload(uploadResponse.upload);
    setUploadedPartNumbers(partsResponse.parts.map((item) => item.partNumber));
    return uploadResponse.upload;
  };

  const prepareUpload = async () => {
    if (!selectedFile || !fileHash) {
      message.warning('请先选择文件');
      return null;
    }

    const response = await createUpload({
      fileName: selectedFile.name,
      fileHash,
      fileSize: selectedFile.size,
      partSize,
    });

    setUpload(response.upload);
    setUploadedPartNumbers(response.upload.uploadedPartNumbers);

    if (response.completed) {
      setStatus('completed');
      setApiMessage('服务端已识别为已完成文件，当前展示为秒传效果。');
      return null;
    }

    if (response.existed && response.upload.uploadedPartNumbers.length > 0) {
      setApiMessage('检测到已有上传进度，已按断点续传继续。');
    } else {
      setApiMessage('已创建上传任务，准备开始上传。');
    }

    return response.upload.uploadId;
  };

  const startUpload = async () => {
    try {
      const uploadId = (await prepareUpload()) ?? upload?.uploadId;

      if (!uploadId) {
        return;
      }

      pauseRef.current = false;
      setStatus('uploading');
      await runConcurrentUpload(uploadId);
      const latestUpload = await syncUpload(uploadId);

      if (latestUpload.uploadedPartCount === latestUpload.totalParts) {
        const completeResult = await completeUpload(uploadId);
        setUpload(completeResult.upload);
        setUploadedPartNumbers(completeResult.upload.uploadedPartNumbers);
        setResultUrl(completeResult.file.url);
        setStatus('completed');
        setApiMessage('文件已上传并完成处理。');
        message.success('上传完成');
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : '上传失败';
      setStatus('ready');
      setApiMessage(messageText);
      message.error(messageText);
    }
  };

  const runConcurrentUpload = async (uploadId: string) => {
    const queue = [...pendingParts];
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length > 0 && !pauseRef.current) {
        const part = queue.shift();
        if (!part) {
          return;
        }

        await sleep(200);
        const response = await putUploadPart({
          uploadId,
          partNumber: part.partNumber,
          partHash: part.partHash,
          size: part.size,
        });
        setUpload(response.upload);
        setUploadedPartNumbers(response.upload.uploadedPartNumbers);
      }
    });

    await Promise.all(workers);

    if (pauseRef.current) {
      setStatus('paused');
      setApiMessage('上传已暂停，可继续恢复。');
    }
  };

  const pauseUpload = () => {
    pauseRef.current = true;
  };

  const resumeUpload = async () => {
    if (!upload) {
      return;
    }

    pauseRef.current = false;
    setStatus('uploading');
    setApiMessage('继续上传中...');

    try {
      await runConcurrentUpload(upload.uploadId);
      const latestUpload = await syncUpload(upload.uploadId);

      if (latestUpload.uploadedPartCount === latestUpload.totalParts) {
        const completeResult = await completeUpload(upload.uploadId);
        setUpload(completeResult.upload);
        setUploadedPartNumbers(completeResult.upload.uploadedPartNumbers);
        setResultUrl(completeResult.file.url);
        setStatus('completed');
        setApiMessage('文件已上传并完成处理。');
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : '继续上传失败';
      setStatus('paused');
      setApiMessage(messageText);
      message.error(messageText);
    }
  };

  const uploadPercent = upload?.progress ?? 0;

  return (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card title="上传参数配置">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Typography.Text>选择文件</Typography.Text>
              <Upload beforeUpload={beforeUpload} maxCount={1} showUploadList={false}>
                <Button type="primary">选择文件</Button>
              </Upload>
              {selectedFile ? (
                <Alert
                  type="info"
                  showIcon
                  message={`当前文件：${selectedFile.name}`}
                  description={`大小：${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`}
                />
              ) : null}
            </Space>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text>分片大小（MB）</Typography.Text>
            <InputNumber
              min={1}
              max={20}
              value={partSizeMb}
              onChange={(value) => setPartSizeMb(value ?? DEFAULT_PART_SIZE_MB)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text>并发数</Typography.Text>
            <InputNumber
              min={1}
              max={6}
              value={concurrency}
              onChange={(value) => setConcurrency(value ?? DEFAULT_CONCURRENCY)}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>

        <Divider />

        <Space wrap>
          <Button
            type="primary"
            onClick={() => void startUpload()}
            disabled={!selectedFile || status === 'hashing' || status === 'uploading'}
          >
            开始上传
          </Button>
          <Button onClick={pauseUpload} disabled={status !== 'uploading'}>
            暂停上传
          </Button>
          <Button onClick={() => void resumeUpload()} disabled={status !== 'paused'}>
            继续上传
          </Button>
          <Tag color="processing">状态：{status}</Tag>
        </Space>
      </Card>

      <Card title="上传进度">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Statistic title="总分片数" value={parts.length} />
          </Col>
          <Col xs={24} md={8}>
            <Statistic title="已上传分片" value={uploadedPartNumbers.length} />
          </Col>
          <Col xs={24} md={8}>
            <Statistic title="上传进度" value={uploadPercent} suffix="%" precision={2} />
          </Col>
        </Row>
        <Divider />
        <Progress percent={uploadPercent} status={status === 'completed' ? 'success' : 'active'} />
        {apiMessage ? <Alert style={{ marginTop: 16 }} type="info" showIcon message={apiMessage} /> : null}
        {resultUrl ? (
          <Alert style={{ marginTop: 16 }} type="success" showIcon message={`处理结果地址：${resultUrl}`} />
        ) : null}
      </Card>

      <Card title="上传任务信息">
        {upload ? (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="uploadId">{upload.uploadId}</Descriptions.Item>
            <Descriptions.Item label="fileHash">{upload.fileHash}</Descriptions.Item>
            <Descriptions.Item label="已上传分片">{upload.uploadedPartNumbers.join(', ') || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">{upload.status}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Alert type="warning" showIcon message="还没有上传任务，请先选择文件并开始上传。" />
        )}
      </Card>

      <Card title="待上传分片">
        <List
          size="small"
          bordered
          dataSource={pendingParts.slice(0, 20)}
          locale={{ emptyText: '当前没有待上传分片' }}
          renderItem={(item) => (
            <List.Item>
              分片 #{item.partNumber} / {parts.length} - {(item.size / 1024 / 1024).toFixed(2)} MB
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );
}
