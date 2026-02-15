const LP_COPY_EXPERIMENT_ID = "lp_copy_test";

const hashText = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
};

export const getLpCopyExperiment = (sessionId = "") => {
  const enabled = process.env.NEXT_PUBLIC_EXPERIMENT_LP_COPY === "1";
  if (!enabled || !sessionId) {
    return { enabled: false, experimentId: "", variant: "" };
  }

  const bucket = hashText(`${LP_COPY_EXPERIMENT_ID}:${sessionId}`) % 2;
  return {
    enabled: true,
    experimentId: LP_COPY_EXPERIMENT_ID,
    variant: bucket === 0 ? "A" : "B"
  };
};

export const toExperimentMeta = (experiment) => {
  if (!experiment?.enabled) return {};
  return {
    experiment_id: experiment.experimentId,
    variant: experiment.variant
  };
};
