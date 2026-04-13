import { Layout, Typography } from 'antd';
import { LargeFileUploaderDocs } from './components/LargeFileUploaderDocs';
import { LargeFileUploadPage } from './pages/LargeFileUploadPage';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;

export default function App() {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header style={{ display: 'flex', alignItems: 'center', background: '#111827' }}>
        <Title level={3} style={{ margin: 0, color: '#fff' }}>
          大文件上传
        </Title>
      </Header>
      <Content style={{ padding: 24 }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <Paragraph style={{ fontSize: 16 }}>
            首个前端项目聚焦大文件上传场景，覆盖分片上传、并发控制、断点续传、秒传判断与上传进度展示。
          </Paragraph>
          <LargeFileUploadPage />
          <div style={{ marginTop: 24 }}>
            <LargeFileUploaderDocs />
          </div>
        </div>
      </Content>
    </Layout>
  );
}
