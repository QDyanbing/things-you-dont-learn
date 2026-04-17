import { Button, ConfigProvider, Upload } from "antd";
import { FileCoordinator } from "./sdk/FileCoordinator";

export default function App() {
  return (
    <ConfigProvider>
      <Upload
        maxCount={1}
        showUploadList={false}
        customRequest={({ file }) => {
          const coordinator = new FileCoordinator(file as unknown as File, {});

          console.log(coordinator.getFile());
        }}
      >
        <Button>Select File</Button>
      </Upload>
    </ConfigProvider>
  );
}
