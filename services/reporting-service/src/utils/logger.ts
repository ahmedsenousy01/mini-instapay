export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.log(
      JSON.stringify({
        level: "info",
        service: "reporting-service",
        timestamp: new Date().toISOString(),
        message,
        ...meta,
      })
    );
  },
  error: (message: string, error?: Error, meta?: Record<string, any>) => {
    console.error(
      JSON.stringify({
        level: "error",
        service: "reporting-service",
        timestamp: new Date().toISOString(),
        message,
        error: error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : undefined,
        ...meta,
      })
    );
  },
};
