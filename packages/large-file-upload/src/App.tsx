import { useState } from 'react';
import { Button, ConfigProvider, Upload } from 'antd';
import type { UploadFile, UploadProps } from 'antd';

export default function App() {
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const uploadProps: UploadProps = {
    beforeUpload: () => false,
    fileList,
    multiple: true,
    onChange: ({ fileList: nextFileList }) => {
      setFileList(nextFileList);
    },
  };

  return (
    <ConfigProvider>
      <Upload {...uploadProps}>
        <Button>Upload</Button>
      </Upload>
    </ConfigProvider>
  );
}
