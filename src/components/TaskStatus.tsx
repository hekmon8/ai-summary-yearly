import { useEffect, useState } from 'react';

interface QueueInfo {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  currentStep: string | null;
  queuePosition: number;
  processingCount: number;
  estimatedWaitTime: number;
  message?: string;
}

interface Task {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
  error?: string;
  progress?: number;
  steps?: Array<{
    name: string;
    status: 'pending' | 'processing' | 'completed';
    time: number;
  }>;
}

interface TaskStatusProps {
  task: Task;
}

export function TaskStatus({ task }: TaskStatusProps) {
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    const fetchQueueInfo = async () => {
      try {
        const response = await fetch(`/api/tasks/queue-info?taskId=${task.id}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch queue info');
        }
        const data = await response.json();
        if (isMounted) {
          setQueueInfo(data);
          setError(null);
        }
      } catch (error) {
        console.error('Failed to fetch queue info:', error);
        if (isMounted) {
          setError(error instanceof Error ? error.message : 'Unknown error');
        }
      }
    };

    // 只有在任务状态为 pending 或 processing 时才获取队列信息
    if (task.status === 'pending' || task.status === 'processing') {
      fetchQueueInfo();
      // 每5秒更新一次队列信息
      pollInterval = setInterval(fetchQueueInfo, 5000);
    }

    return () => {
      isMounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [task.id, task.status]);

  const renderQueueInfo = () => {
    if (!queueInfo) return null;

    return (
      <div className="text-sm text-gray-600 space-y-1">
        {queueInfo.status === 'pending' && (
          <>
            <p>前方还有 {queueInfo.queuePosition} 个任务在等待</p>
            <p>当前有 {queueInfo.processingCount} 个任务正在处理</p>
            <p>预计等待时间: {queueInfo.estimatedWaitTime} 秒</p>
          </>
        )}
        {queueInfo.status === 'processing' && queueInfo.currentStep && (
          <p>当前步骤: {
            queueInfo.currentStep === 'github_data' ? 'GitHub 数据获取' :
            queueInfo.currentStep === 'content_generation' ? '生成年度总结' :
            queueInfo.currentStep === 'image_generation' ? '生成图片' :
            queueInfo.currentStep
          }</p>
        )}
        {queueInfo.message && (
          <p className="text-blue-600">{queueInfo.message}</p>
        )}
      </div>
    );
  };

  const renderStatus = () => {
    switch (task.status) {
      case 'pending':
        return (
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="animate-spin mr-2">⏳</div>
              <span>排队中...</span>
            </div>
            {renderQueueInfo()}
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
          </div>
        );
      case 'processing':
        return (
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="animate-pulse mr-2">🔄</div>
              <span>{task.message || '正在生成中...'}</span>
            </div>
            {renderQueueInfo()}
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300" 
                style={{ width: `${task.progress || 0}%` }} 
              />
            </div>
            {task.steps && (
              <div className="mt-2 space-y-1">
                {task.steps.map(step => (
                  <div key={step.name} className="flex items-center text-sm">
                    <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                      step.status === 'completed' ? 'bg-green-500' :
                      step.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                      'bg-gray-300'
                    }`} />
                    <span className={`${
                      step.status === 'processing' ? 'text-blue-600' :
                      step.status === 'completed' ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      {step.name === 'github_data' ? 'GitHub 数据获取' :
                       step.name === 'content_generation' ? '生成年度总结' :
                       step.name === 'image_generation' ? '生成图片' : step.name}
                    </span>
                    {step.status === 'processing' && (
                      <span className="ml-2 text-xs text-gray-400">
                        预计还需 {Math.ceil(step.time / 1000)} 秒
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center text-green-600">
            <div className="mr-2">✅</div>
            <span>生成完成</span>
          </div>
        );
      case 'failed':
        return (
          <div className="space-y-2 text-red-600">
            <div className="flex items-center">
              <div className="mr-2">❌</div>
              <span>生成失败</span>
            </div>
            {task.error && (
              <p className="text-sm">{task.error}</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg border p-4 bg-white shadow-sm">
      <h3 className="font-medium mb-2">任务状态</h3>
      {renderStatus()}
    </div>
  );
} 