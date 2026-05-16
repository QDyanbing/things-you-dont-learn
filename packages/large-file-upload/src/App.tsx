import { useState } from "react";
import { Button, ConfigProvider, Upload } from "antd";
import { FileCoordinator } from "./sdk/FileCoordinator";

/**
 * Temporarily marks one chunk as failed so the demo can show the failed-index getter.
 */
function readFailedChunkIndexesPreview(
  coordinator: FileCoordinator,
  index: number,
) {
  const originalStatus = coordinator.getChunkStatus(index);

  if (!originalStatus) {
    return [];
  }

  coordinator.setChunkStatus(index, "ERROR");
  const failedIndexes = coordinator.getFailedChunkIndexes();

  return failedIndexes;
}

export default function App() {
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [fileLastModified, setFileLastModified] = useState(0);
  const [fileIdentity, setFileIdentity] = useState("");
  const [isPrepared, setIsPrepared] = useState(false);
  const [hasFirstChunk, setHasFirstChunk] = useState(false);
  const [firstChunkIdentity, setFirstChunkIdentity] = useState("");
  const [firstChunkStatus, setFirstChunkStatus] = useState("");
  const [isFirstChunkUploaded, setIsFirstChunkUploaded] = useState(false);
  const [restoredChunkCount, setRestoredChunkCount] = useState(0);
  const [uploadedChunkIndexes, setUploadedChunkIndexes] = useState("");
  const [hasUploadedChunks, setHasUploadedChunks] = useState(false);
  const [firstUploadedChunkIndex, setFirstUploadedChunkIndex] = useState("");
  const [lastUploadedChunkIndex, setLastUploadedChunkIndex] = useState("");
  const [queuedChunkIndexes, setQueuedChunkIndexes] = useState("");
  const [hasQueuedChunks, setHasQueuedChunks] = useState(false);
  const [firstQueuedChunkIndex, setFirstQueuedChunkIndex] = useState("");
  const [lastQueuedChunkIndex, setLastQueuedChunkIndex] = useState("");
  const [pendingChunkIndexes, setPendingChunkIndexes] = useState("");
  const [hasPendingChunks, setHasPendingChunks] = useState(false);
  const [remainingChunkCount, setRemainingChunkCount] = useState(0);
  const [nextPendingChunkIndex, setNextPendingChunkIndex] = useState("");
  const [uploadingChunkIndexes, setUploadingChunkIndexes] = useState("");
  const [hasUploadingChunks, setHasUploadingChunks] = useState(false);
  const [firstUploadingChunkIndex, setFirstUploadingChunkIndex] = useState("");
  const [lastUploadingChunkIndex, setLastUploadingChunkIndex] = useState("");
  const [uploadingChunkCount, setUploadingChunkCount] = useState(0);
  const [failedChunkIndexes, setFailedChunkIndexes] = useState("");
  const [firstFailedChunkIndex, setFirstFailedChunkIndex] = useState("");
  const [lastFailedChunkIndex, setLastFailedChunkIndex] = useState("");
  const [failedChunkCount, setFailedChunkCount] = useState(0);
  const [hasFailedChunks, setHasFailedChunks] = useState(false);
  const [chunkStatusCounts, setChunkStatusCounts] = useState("");
  const [firstChunkRange, setFirstChunkRange] = useState("");
  const [firstChunkByteRange, setFirstChunkByteRange] = useState("");
  const [firstChunkType, setFirstChunkType] = useState("");
  const [firstChunkBlobSize, setFirstChunkBlobSize] = useState(0);
  const [firstChunkBlobType, setFirstChunkBlobType] = useState("");
  const [firstChunkProgressPercent, setFirstChunkProgressPercent] = useState(0);
  const [firstChunkRemainingBytes, setFirstChunkRemainingBytes] = useState(0);
  const [status, setStatus] = useState("");
  const [chunkCount, setChunkCount] = useState(0);
  const [preparedChunkIndexes, setPreparedChunkIndexes] = useState("");
  const [preparedByteSize, setPreparedByteSize] = useState(0);
  const [uploadedChunkCount, setUploadedChunkCount] = useState(0);
  const [completionRatio, setCompletionRatio] = useState(0);
  const [cachedChunkCount, setCachedChunkCount] = useState(0);
  const [resetFailedChunkCount, setResetFailedChunkCount] = useState(0);
  const [canResetUploadProgress, setCanResetUploadProgress] = useState(false);
  const [resetChunkCount, setResetChunkCount] = useState(0);
  const [canCancel, setCanCancel] = useState(false);
  const [cancelResult, setCancelResult] = useState(false);
  const [canPause, setCanPause] = useState(false);
  const [pauseResult, setPauseResult] = useState(false);
  const [canResume, setCanResume] = useState(false);
  const [resumeResult, setResumeResult] = useState(false);
  const [canUpload, setCanUpload] = useState(false);
  const [progressUploadedBytes, setProgressUploadedBytes] = useState(0);
  const [progressTotalBytes, setProgressTotalBytes] = useState(0);
  const [progressRemainingBytes, setProgressRemainingBytes] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [resolvedChunkSize, setResolvedChunkSize] = useState(0);
  const [resolvedConcurrency, setResolvedConcurrency] = useState(0);
  const [chunkSize, setChunkSize] = useState(0);
  const [prepareCalls, setPrepareCalls] = useState(0);

  return (
    <ConfigProvider>
      <>
        <Upload
          maxCount={1}
          showUploadList={false}
          customRequest={async ({ file, onError, onSuccess }) => {
            try {
              const coordinator = new FileCoordinator(file as File, {
                concurrency: 2,
                async uploadChunk({ chunk, chunkInfo, fileIdentity, signal, reportProgress }) {
                  const formData = new FormData();

                  formData.append("file", chunk);
                  formData.append("fileIdentity", fileIdentity);
                  formData.append("index", String(chunkInfo.index));
                  reportProgress(chunk.size / 2, chunk.size);

                  await new Promise<void>((resolve, reject) => {
                    const timer = window.setTimeout(() => {
                      signal.removeEventListener("abort", handleAbort);
                      reportProgress(chunk.size, chunk.size);
                      resolve();
                    }, 120);

                    function handleAbort() {
                      window.clearTimeout(timer);
                      reject(new DOMException("Upload canceled.", "AbortError"));
                    }

                    if (signal.aborted) {
                      handleAbort();
                      return;
                    }

                    signal.addEventListener("abort", handleAbort, { once: true });
                  });

                  await Promise.resolve(formData);
                },
              });
              const updatedChunkSize = coordinator.setChunkSize(1024 * 1024);

              setFileName(coordinator.getFile().name);
              setFileSize(0);
              setFileLastModified(coordinator.getFile().lastModified);
              setFileIdentity(coordinator.getFileIdentity());
              setIsPrepared(false);
              setHasFirstChunk(false);
              setFirstChunkIdentity("");
              setFirstChunkStatus("");
              setIsFirstChunkUploaded(false);
              setRestoredChunkCount(0);
              setUploadedChunkIndexes("");
              setHasUploadedChunks(false);
              setFirstUploadedChunkIndex("");
              setLastUploadedChunkIndex("");
              setQueuedChunkIndexes("");
              setHasQueuedChunks(false);
              setFirstQueuedChunkIndex("");
              setLastQueuedChunkIndex("");
              setPendingChunkIndexes("");
              setHasPendingChunks(false);
              setRemainingChunkCount(0);
              setNextPendingChunkIndex("");
              setUploadingChunkIndexes("");
              setHasUploadingChunks(false);
              setFirstUploadingChunkIndex("");
              setLastUploadingChunkIndex("");
              setUploadingChunkCount(0);
              setFailedChunkIndexes("");
              setFirstFailedChunkIndex("");
              setLastFailedChunkIndex("");
              setFailedChunkCount(0);
              setHasFailedChunks(false);
              setChunkStatusCounts("");
              setFirstChunkRange("");
              setFirstChunkByteRange("");
              setFirstChunkType("");
              setFirstChunkBlobSize(0);
              setFirstChunkBlobType("");
              setFirstChunkProgressPercent(0);
              setFirstChunkRemainingBytes(0);
              setStatus(coordinator.getStatus());
              setChunkCount(coordinator.getChunkCount());
              setPreparedChunkIndexes("");
              setPreparedByteSize(0);
              setUploadedChunkCount(0);
              setCompletionRatio(0);
              setCachedChunkCount(0);
              setResetFailedChunkCount(0);
              setCanResetUploadProgress(false);
              setResetChunkCount(0);
              setCanCancel(false);
              setCancelResult(false);
              setCanPause(false);
              setPauseResult(false);
              setCanResume(false);
              setResumeResult(false);
              setCanUpload(false);
              setProgressUploadedBytes(0);
              setProgressTotalBytes(0);
              setProgressRemainingBytes(0);
              setProgressPercent(0);
              setResolvedChunkSize(updatedChunkSize);
              setResolvedConcurrency(coordinator.getOptions().concurrency);
              setChunkSize(0);
              setPrepareCalls(0);

              const [, prepareResult] = await Promise.all([
                coordinator.prepare(),
                coordinator.prepare(),
              ]);
              const latestPrepareResult = coordinator.getPrepareResult();
              const prepared = coordinator.isPrepared();
              const hasPreparedFirstChunk = coordinator.hasChunk(0);
              const currentPreparedChunkIndexes = coordinator.getPreparedChunkIndexes();
              const currentPreparedByteSize = coordinator.getPreparedByteSize();
              const currentRestoredChunkCount = coordinator.setUploadedChunks([0]);
              const currentUploadedChunkIndexes = coordinator.getUploadedChunkIndexes();
              const currentHasUploadedChunks = coordinator.hasUploadedChunks();
              const currentFirstUploadedChunkIndex = coordinator.getFirstUploadedChunkIndex();
              const currentLastUploadedChunkIndex = coordinator.getLastUploadedChunkIndex();
              const currentCompletionRatio = coordinator.getCompletionRatio();
              const currentCanUpload = coordinator.canUpload();
              const uploadTask = coordinator.upload();
              const currentCanCancel = coordinator.canCancel();
              const currentCanPause = coordinator.canPause();
              const currentUploadingChunkIndexes = coordinator.getUploadingChunkIndexes();
              const currentHasUploadingChunks = coordinator.hasUploadingChunks();
              const currentFirstUploadingChunkIndex = coordinator.getFirstUploadingChunkIndex();
              const currentLastUploadingChunkIndex = coordinator.getLastUploadingChunkIndex();
              const currentUploadingChunkCount = coordinator.getUploadingChunkCount();
              const currentPauseResult = coordinator.pause();
              const currentCanResume = coordinator.canResume();
              await uploadTask.catch(() => undefined);
              const currentResumeResult = await coordinator.resume();
              const preparedFirstChunkIdentity = coordinator.getChunkIdentity(0);
              const currentFailedChunkIndexes = readFailedChunkIndexesPreview(
                coordinator,
                0,
              );
              const currentFirstFailedChunkIndex = coordinator.getFirstFailedChunkIndex();
              const currentLastFailedChunkIndex = coordinator.getLastFailedChunkIndex();
              const currentFailedChunkCount = coordinator.getFailedChunkCount();
              const currentHasFailedChunks = coordinator.hasFailedChunks();
              const currentResetFailedChunkCount = coordinator.resetFailedChunks();
              const currentCanResetUploadProgress = coordinator.canResetUploadProgress();
              const currentResetChunkCount = coordinator.resetUploadProgress();
              const preparedFirstChunkStatus = coordinator.getChunkStatus(0);
              const firstChunkUploaded = coordinator.isChunkUploaded(0);
              const currentQueuedChunkIndexes = coordinator.getQueuedChunkIndexes();
              const currentHasQueuedChunks = coordinator.hasQueuedChunks();
              const currentFirstQueuedChunkIndex = coordinator.getFirstQueuedChunkIndex();
              const currentLastQueuedChunkIndex = coordinator.getLastQueuedChunkIndex();
              const currentPendingChunkIndexes = coordinator.getPendingChunkIndexes();
              const currentHasPendingChunks = coordinator.hasPendingChunks();
              const currentRemainingChunkCount = coordinator.getRemainingChunkCount();
              const currentNextPendingChunkIndex = coordinator.getNextPendingChunkIndex();
              const progress = coordinator.getProgress();
              const statusCounts = coordinator.getChunkStatusCounts();
              const firstChunkInfo = coordinator.getChunkInfo(0);
              const firstChunkByteRangeSnapshot = coordinator.getChunkByteRange(0);
              const firstChunk = coordinator.getChunk(0);
              const firstChunkProgress = coordinator.getChunkProgress(0);

              setFileIdentity(prepareResult.fileIdentity);
              setIsPrepared(prepared);
              setHasFirstChunk(hasPreparedFirstChunk);
              setFirstChunkIdentity(preparedFirstChunkIdentity ?? "");
              setFirstChunkStatus(preparedFirstChunkStatus ?? "");
              setIsFirstChunkUploaded(firstChunkUploaded);
              setRestoredChunkCount(currentRestoredChunkCount);
              setUploadedChunkIndexes(currentUploadedChunkIndexes.join(","));
              setHasUploadedChunks(currentHasUploadedChunks);
              setFirstUploadedChunkIndex(
                currentFirstUploadedChunkIndex === null
                  ? ""
                  : String(currentFirstUploadedChunkIndex),
              );
              setLastUploadedChunkIndex(
                currentLastUploadedChunkIndex === null
                  ? ""
                  : String(currentLastUploadedChunkIndex),
              );
              setQueuedChunkIndexes(currentQueuedChunkIndexes.join(","));
              setHasQueuedChunks(currentHasQueuedChunks);
              setFirstQueuedChunkIndex(
                currentFirstQueuedChunkIndex === null
                  ? ""
                  : String(currentFirstQueuedChunkIndex),
              );
              setLastQueuedChunkIndex(
                currentLastQueuedChunkIndex === null
                  ? ""
                  : String(currentLastQueuedChunkIndex),
              );
              setPendingChunkIndexes(currentPendingChunkIndexes.join(","));
              setHasPendingChunks(currentHasPendingChunks);
              setRemainingChunkCount(currentRemainingChunkCount);
              setNextPendingChunkIndex(
                currentNextPendingChunkIndex === null
                  ? ""
                  : String(currentNextPendingChunkIndex),
              );
              setUploadingChunkIndexes(currentUploadingChunkIndexes.join(","));
              setHasUploadingChunks(currentHasUploadingChunks);
              setFirstUploadingChunkIndex(
                currentFirstUploadingChunkIndex === null
                  ? ""
                  : String(currentFirstUploadingChunkIndex),
              );
              setLastUploadingChunkIndex(
                currentLastUploadingChunkIndex === null
                  ? ""
                  : String(currentLastUploadingChunkIndex),
              );
              setUploadingChunkCount(currentUploadingChunkCount);
              setFailedChunkIndexes(currentFailedChunkIndexes.join(","));
              setFirstFailedChunkIndex(
                currentFirstFailedChunkIndex === null
                  ? ""
                  : String(currentFirstFailedChunkIndex),
              );
              setLastFailedChunkIndex(
                currentLastFailedChunkIndex === null
                  ? ""
                  : String(currentLastFailedChunkIndex),
              );
              setFailedChunkCount(currentFailedChunkCount);
              setHasFailedChunks(currentHasFailedChunks);
              setChunkStatusCounts(
                [
                  statusCounts.pending,
                  statusCounts.uploading,
                  statusCounts.success,
                  statusCounts.error,
                ].join("/"),
              );
              setFileSize(prepareResult.fileSize);
              setFirstChunkRange(
                firstChunkInfo
                  ? `${firstChunkInfo.start}-${firstChunkInfo.end}`
                  : "",
              );
              setFirstChunkByteRange(
                firstChunkByteRangeSnapshot
                  ? [
                      firstChunkByteRangeSnapshot.start,
                      firstChunkByteRangeSnapshot.end,
                      firstChunkByteRangeSnapshot.size,
                    ].join("/")
                  : "",
              );
              setFirstChunkType(firstChunkInfo?.type ?? "");
              setFirstChunkBlobSize(firstChunk?.size ?? 0);
              setFirstChunkBlobType(firstChunk?.type ?? "");
              setFirstChunkProgressPercent(firstChunkProgress?.percent ?? 0);
              setFirstChunkRemainingBytes(firstChunkProgress?.remainingBytes ?? 0);
              setStatus(coordinator.getStatus());
              setChunkCount(prepareResult.chunkCount);
              setPreparedChunkIndexes(currentPreparedChunkIndexes.join(","));
              setPreparedByteSize(currentPreparedByteSize);
              setUploadedChunkCount(coordinator.getUploadedChunkCount());
              setCompletionRatio(currentCompletionRatio);
              setCachedChunkCount(latestPrepareResult?.chunkCount ?? 0);
              setResetFailedChunkCount(currentResetFailedChunkCount);
              setCanResetUploadProgress(currentCanResetUploadProgress);
              setResetChunkCount(currentResetChunkCount);
              setCanCancel(currentCanCancel);
              setCancelResult(false);
              setCanPause(currentCanPause);
              setPauseResult(currentPauseResult);
              setCanResume(currentCanResume);
              setResumeResult(currentResumeResult);
              setCanUpload(currentCanUpload);
              setProgressUploadedBytes(progress.uploadedBytes);
              setProgressTotalBytes(progress.totalBytes);
              setProgressRemainingBytes(progress.remainingBytes);
              setProgressPercent(progress.percent);
              setChunkSize(prepareResult.chunkSize);
              setPrepareCalls(2);
              onSuccess?.({}, file);
            } catch (error) {
              onError?.(error as Error);
            }
          }}
        >
          <Button>Select File</Button>
        </Upload>
        {fileName ? <div>file: {fileName}</div> : null}
        <div>fileSize: {fileSize}</div>
        <div>lastModified: {fileLastModified}</div>
        {fileIdentity ? <div>identity: {fileIdentity}</div> : null}
        <div>isPrepared: {String(isPrepared)}</div>
        <div>hasFirstChunk: {String(hasFirstChunk)}</div>
        {firstChunkIdentity ? <div>firstChunkIdentity: {firstChunkIdentity}</div> : null}
        {firstChunkStatus ? <div>firstChunkStatus: {firstChunkStatus}</div> : null}
        <div>isFirstChunkUploaded: {String(isFirstChunkUploaded)}</div>
        <div>restoredChunkCount: {restoredChunkCount}</div>
        <div>uploadedChunkIndexes: {uploadedChunkIndexes}</div>
        <div>hasUploadedChunks: {String(hasUploadedChunks)}</div>
        <div>firstUploadedChunkIndex: {firstUploadedChunkIndex}</div>
        <div>lastUploadedChunkIndex: {lastUploadedChunkIndex}</div>
        <div>queuedChunkIndexes: {queuedChunkIndexes}</div>
        <div>hasQueuedChunks: {String(hasQueuedChunks)}</div>
        <div>firstQueuedChunkIndex: {firstQueuedChunkIndex}</div>
        <div>lastQueuedChunkIndex: {lastQueuedChunkIndex}</div>
        <div>pendingChunkIndexes: {pendingChunkIndexes}</div>
        <div>hasPendingChunks: {String(hasPendingChunks)}</div>
        <div>remainingChunkCount: {remainingChunkCount}</div>
        <div>nextPendingChunkIndex: {nextPendingChunkIndex}</div>
        <div>uploadingChunkIndexes: {uploadingChunkIndexes}</div>
        <div>hasUploadingChunks: {String(hasUploadingChunks)}</div>
        <div>firstUploadingChunkIndex: {firstUploadingChunkIndex}</div>
        <div>lastUploadingChunkIndex: {lastUploadingChunkIndex}</div>
        <div>uploadingChunkCount: {uploadingChunkCount}</div>
        <div>failedChunkIndexes: {failedChunkIndexes}</div>
        <div>firstFailedChunkIndex: {firstFailedChunkIndex}</div>
        <div>lastFailedChunkIndex: {lastFailedChunkIndex}</div>
        <div>failedChunkCount: {failedChunkCount}</div>
        <div>hasFailedChunks: {String(hasFailedChunks)}</div>
        <div>chunkStatusCounts: {chunkStatusCounts}</div>
        {firstChunkRange ? <div>firstChunkRange: {firstChunkRange}</div> : null}
        {firstChunkByteRange ? <div>firstChunkByteRange: {firstChunkByteRange}</div> : null}
        {firstChunkType ? <div>firstChunkType: {firstChunkType}</div> : null}
        <div>firstChunkBlobSize: {firstChunkBlobSize}</div>
        {firstChunkBlobType ? <div>firstChunkBlobType: {firstChunkBlobType}</div> : null}
        <div>firstChunkProgressPercent: {firstChunkProgressPercent}</div>
        <div>firstChunkRemainingBytes: {firstChunkRemainingBytes}</div>
        {status ? <div>status: {status}</div> : null}
        <div>chunkCount: {chunkCount}</div>
        <div>preparedChunkIndexes: {preparedChunkIndexes}</div>
        <div>preparedByteSize: {preparedByteSize}</div>
        <div>uploadedChunkCount: {uploadedChunkCount}</div>
        <div>completionRatio: {completionRatio}</div>
        <div>cachedChunkCount: {cachedChunkCount}</div>
        <div>resetFailedChunkCount: {resetFailedChunkCount}</div>
        <div>canResetUploadProgress: {String(canResetUploadProgress)}</div>
        <div>resetChunkCount: {resetChunkCount}</div>
        <div>canCancel: {String(canCancel)}</div>
        <div>cancelResult: {String(cancelResult)}</div>
        <div>canPause: {String(canPause)}</div>
        <div>pauseResult: {String(pauseResult)}</div>
        <div>canResume: {String(canResume)}</div>
        <div>resumeResult: {String(resumeResult)}</div>
        <div>canUpload: {String(canUpload)}</div>
        <div>progressUploadedBytes: {progressUploadedBytes}</div>
        <div>progressTotalBytes: {progressTotalBytes}</div>
        <div>progressRemainingBytes: {progressRemainingBytes}</div>
        <div>progressPercent: {progressPercent}</div>
        <div>resolvedChunkSize: {resolvedChunkSize}</div>
        <div>resolvedConcurrency: {resolvedConcurrency}</div>
        <div>chunkSize: {chunkSize}</div>
        <div>prepareCalls: {prepareCalls}</div>
      </>
    </ConfigProvider>
  );
}
