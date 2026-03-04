
import AjvPkg, { type ErrorObject } from "ajv";
import {
    AgentIdentityParamsSchema,
    AgentParamsSchema,
    AgentSummarySchema,
    AgentsListParamsSchema,
    ChatAbortParamsSchema,
    ChatEventSchema,
    ChatHistoryParamsSchema,
    ChatInjectParamsSchema,
    ChatSendParamsSchema,
    ChannelsLogoutParamsSchema,
    ChannelsStatusParamsSchema,
    ConfigApplyParamsSchema,
    ConfigGetParamsSchema,
    ConfigPatchParamsSchema,
    ConfigSchemaParamsSchema,
    ConfigSetParamsSchema,
    CronAddParamsSchema,
    CronListParamsSchema,
    CronRemoveParamsSchema,
    CronRunParamsSchema,
    CronRunsParamsSchema,
    CronStatusParamsSchema,
    CronUpdateParamsSchema,
    DevicePairApproveParamsSchema,
    DevicePairListParamsSchema,
    DevicePairRejectParamsSchema,
    DeviceTokenRotateParamsSchema,
    DeviceTokenRevokeParamsSchema,
    ModelsListParamsSchema,
    NodeDescribeParamsSchema,
    NodeEventParamsSchema,
    SendParamsSchema,
    SkillsBinsParamsSchema,
    SkillsInstallParamsSchema,
    SkillsUpdateParamsSchema,
    TalkModeParamsSchema,
    WakeParamsSchema,
    NodeInvokeParamsSchema,
    NodeInvokeResultParamsSchema,
    NodeListParamsSchema,
    NodePairApproveParamsSchema,
    NodePairListParamsSchema,
    NodePairRejectParamsSchema,
    NodePairRequestParamsSchema,
    NodePairVerifyParamsSchema,
    SessionsCompactParamsSchema,
    SessionsDeleteParamsSchema,
    SessionsListParamsSchema,
    SessionsPatchParamsSchema,
    SessionsPreviewParamsSchema,
    SessionsResetParamsSchema,
    SessionsResolveParamsSchema,
    SkillsStatusParamsSchema,
    UpdateRunParamsSchema,
    WebLoginStartParamsSchema,
    WebLoginWaitParamsSchema,
    RequestFrameSchema,
    ResponseFrameSchema,
    EventFrameSchema,
    ConnectParamsSchema,
    WizardStartParamsSchema,
    WizardNextParamsSchema,
    WizardCancelParamsSchema,
    WizardStatusParamsSchema,
    AgentWaitParamsSchema,
    ExecApprovalsGetParamsSchema,
    ExecApprovalsNodeGetParamsSchema,
    ExecApprovalsNodeSetParamsSchema,
    ExecApprovalsSetParamsSchema,
    ExecApprovalRequestParamsSchema,
    ExecApprovalResolveParamsSchema,
    LogsTailParamsSchema,
    MemorySearchParamsSchema,
    NodeRenameParamsSchema,
    PollParamsSchema,
    type AgentIdentityParams,
    type AgentParams,
    type AgentSummary,
    type AgentsListParams,
    type ChannelsLogoutParams,
    type ChannelsStatusParams,
    type ChatAbortParams,
    type ChatInjectParams,
    type ConfigApplyParams,
    type ConfigGetParams,
    type ConfigPatchParams,
    type ConfigSchemaParams,
    type ConfigSetParams,
    type CronAddParams,
    type CronListParams,
    type CronRemoveParams,
    type CronRunParams,
    type CronRunsParams,
    type CronStatusParams,
    type CronUpdateParams,
    type DevicePairApproveParams,
    type DevicePairListParams,
    type DevicePairRejectParams,
    type DeviceTokenRotateParams,
    type DeviceTokenRevokeParams,
    type ModelsListParams,
    type NodeDescribeParams,
    type NodeEventParams,
    type SendParams,
    type SkillsBinsParams,
    type SkillsInstallParams,
    type SkillsUpdateParams,
    type TalkModeParams,
    type WakeParams,
    type NodeInvokeParams,
    type NodeInvokeResultParams,
    type NodeListParams,
    type NodePairApproveParams,
    type NodePairListParams,
    type NodePairRejectParams,
    type NodePairRequestParams,
    type NodePairVerifyParams,
    type SessionsCompactParams,
    type SessionsDeleteParams,
    type SessionsListParams,
    type SessionsPatchParams,
    type SessionsPreviewParams,
    type SessionsResetParams,
    type SessionsResolveParams,
    type SkillsStatusParams,
    type UpdateRunParams,
    type WebLoginStartParams,
    type WebLoginWaitParams,
    type ConnectParams,
    type RequestFrame,
    type ResponseFrame,
    type EventFrame,
    type WizardStartParams,
    type WizardNextParams,
    type WizardCancelParams,
    type WizardStatusParams,
    type AgentWaitParams,
    type ExecApprovalsGetParams,
    type ExecApprovalsNodeGetParams,
    type ExecApprovalsNodeSetParams,
    type ExecApprovalsSetParams,
    type ExecApprovalRequestParams,
    type ExecApprovalResolveParams,
    type LogsTailParams,
    type MemorySearchParams,
    type NodeRenameParams,
    type PollParams,
} from "./schema.js";

const ajv = new (AjvPkg as unknown as new (opts?: object) => import("ajv").default)({
    allErrors: true,
    strict: false,
    removeAdditional: false,
});

export const validateCronListParams = ajv.compile<CronListParams>(CronListParamsSchema);
export const validateCronStatusParams = ajv.compile<CronStatusParams>(CronStatusParamsSchema);
export const validateCronAddParams = ajv.compile<CronAddParams>(CronAddParamsSchema);
export const validateCronUpdateParams = ajv.compile<CronUpdateParams>(CronUpdateParamsSchema);
export const validateCronRemoveParams = ajv.compile<CronRemoveParams>(CronRemoveParamsSchema);
export const validateCronRunParams = ajv.compile<CronRunParams>(CronRunParamsSchema);
export const validateCronRunsParams = ajv.compile<CronRunsParams>(CronRunsParamsSchema);

export const validateSessionsListParams = ajv.compile<SessionsListParams>(SessionsListParamsSchema);
export const validateSessionsPreviewParams = ajv.compile<SessionsPreviewParams>(
    SessionsPreviewParamsSchema,
);
export const validateSessionsResolveParams = ajv.compile<SessionsResolveParams>(
    SessionsResolveParamsSchema,
);
export const validateSessionsPatchParams = ajv.compile<SessionsPatchParams>(
    SessionsPatchParamsSchema,
);
export const validateSessionsResetParams = ajv.compile<SessionsResetParams>(
    SessionsResetParamsSchema,
);
export const validateSessionsDeleteParams = ajv.compile<SessionsDeleteParams>(
    SessionsDeleteParamsSchema,
);
export const validateSessionsCompactParams = ajv.compile<SessionsCompactParams>(
    SessionsCompactParamsSchema,
);

export const validateAgentsListParams = ajv.compile<AgentsListParams>(AgentsListParamsSchema);
export const validateAgentIdentityParams = ajv.compile<AgentIdentityParams>(
    AgentIdentityParamsSchema,
);
export const validateAgentSummary = ajv.compile<AgentSummary>(AgentSummarySchema);

export const validateNodeListParams = ajv.compile<NodeListParams>(NodeListParamsSchema);
export const validateNodeDescribeParams = ajv.compile<NodeDescribeParams>(NodeDescribeParamsSchema);
export const validateNodeInvokeParams = ajv.compile<NodeInvokeParams>(NodeInvokeParamsSchema);
export const validateNodeInvokeResultParams = ajv.compile<NodeInvokeResultParams>(
    NodeInvokeResultParamsSchema,
);
export const validateNodeEventParams = ajv.compile<NodeEventParams>(NodeEventParamsSchema);

export const validateNodePairRequestParams = ajv.compile<NodePairRequestParams>(
    NodePairRequestParamsSchema,
);
export const validateNodePairListParams = ajv.compile<NodePairListParams>(NodePairListParamsSchema);
export const validateNodePairApproveParams = ajv.compile<NodePairApproveParams>(
    NodePairApproveParamsSchema,
);
export const validateNodePairRejectParams = ajv.compile<NodePairRejectParams>(
    NodePairRejectParamsSchema,
);
export const validateNodePairVerifyParams = ajv.compile<NodePairVerifyParams>(
    NodePairVerifyParamsSchema,
);

export const validateModelsListParams = ajv.compile<ModelsListParams>(ModelsListParamsSchema);
export const validateSkillsStatusParams = ajv.compile<SkillsStatusParams>(SkillsStatusParamsSchema);

export const validateDevicePairListParams = ajv.compile<DevicePairListParams>(
    DevicePairListParamsSchema,
);
export const validateDevicePairApproveParams = ajv.compile<DevicePairApproveParams>(
    DevicePairApproveParamsSchema,
);
export const validateSkillsBinsParams = ajv.compile<SkillsBinsParams>(SkillsBinsParamsSchema);
export const validateSkillsInstallParams = ajv.compile<SkillsInstallParams>(SkillsInstallParamsSchema);
export const validateSkillsUpdateParams = ajv.compile<SkillsUpdateParams>(SkillsUpdateParamsSchema);
export const validateSendParams = ajv.compile<SendParams>(SendParamsSchema);
export const validateTalkModeParams = ajv.compile<TalkModeParams>(TalkModeParamsSchema);

export const validateDevicePairRejectParams = ajv.compile<DevicePairRejectParams>(
    DevicePairRejectParamsSchema,
);
export const validateDeviceTokenRotateParams = ajv.compile<DeviceTokenRotateParams>(
    DeviceTokenRotateParamsSchema,
);
export const validateDeviceTokenRevokeParams = ajv.compile<DeviceTokenRevokeParams>(
    DeviceTokenRevokeParamsSchema,
);

export const validateChatHistoryParams = ajv.compile(ChatHistoryParamsSchema);
export const validateChatSendParams = ajv.compile(ChatSendParamsSchema);
export const validateChatAbortParams = ajv.compile<ChatAbortParams>(ChatAbortParamsSchema);
export const validateChatInjectParams = ajv.compile<ChatInjectParams>(ChatInjectParamsSchema);
export const validateChatEvent = ajv.compile(ChatEventSchema);

export const validateUpdateRunParams = ajv.compile<UpdateRunParams>(UpdateRunParamsSchema);
export const validateWebLoginStartParams = ajv.compile<WebLoginStartParams>(
    WebLoginStartParamsSchema,
);
export const validateWebLoginWaitParams = ajv.compile<WebLoginWaitParams>(WebLoginWaitParamsSchema);

export const validateRequestFrame = ajv.compile<RequestFrame>(RequestFrameSchema);
export const validateResponseFrame = ajv.compile<ResponseFrame>(ResponseFrameSchema);
export const validateEventFrame = ajv.compile<EventFrame>(EventFrameSchema);
export const validateConnectParams = ajv.compile<ConnectParams>(ConnectParamsSchema);

export const validateWizardStartParams = ajv.compile<WizardStartParams>(WizardStartParamsSchema);
export const validateWizardNextParams = ajv.compile<WizardNextParams>(WizardNextParamsSchema);
export const validateWizardCancelParams = ajv.compile<WizardCancelParams>(WizardCancelParamsSchema);
export const validateWizardStatusParams = ajv.compile<WizardStatusParams>(WizardStatusParamsSchema);

export const validateAgentWaitParams = ajv.compile<AgentWaitParams>(AgentWaitParamsSchema);
export const validateExecApprovalsGetParams = ajv.compile<ExecApprovalsGetParams>(ExecApprovalsGetParamsSchema);
export const validateExecApprovalsNodeGetParams = ajv.compile<ExecApprovalsNodeGetParams>(ExecApprovalsNodeGetParamsSchema);
export const validateExecApprovalsNodeSetParams = ajv.compile<ExecApprovalsNodeSetParams>(ExecApprovalsNodeSetParamsSchema);
export const validateExecApprovalsSetParams = ajv.compile<ExecApprovalsSetParams>(ExecApprovalsSetParamsSchema);
export const validateExecApprovalRequestParams = ajv.compile<ExecApprovalRequestParams>(ExecApprovalRequestParamsSchema);
export const validateExecApprovalResolveParams = ajv.compile<ExecApprovalResolveParams>(ExecApprovalResolveParamsSchema);
export const validateLogsTailParams = ajv.compile<LogsTailParams>(LogsTailParamsSchema);
export const validateMemorySearchParams = ajv.compile<MemorySearchParams>(MemorySearchParamsSchema);
export const validateNodeRenameParams = ajv.compile<NodeRenameParams>(NodeRenameParamsSchema);
export const validatePollParams = ajv.compile<PollParams>(PollParamsSchema);
export const validateAgentParams = ajv.compile<AgentParams>(AgentParamsSchema);
export const validateChannelsLogoutParams = ajv.compile<ChannelsLogoutParams>(ChannelsLogoutParamsSchema);
export const validateChannelsStatusParams = ajv.compile<ChannelsStatusParams>(ChannelsStatusParamsSchema);
export const validateConfigGetParams = ajv.compile<ConfigGetParams>(ConfigGetParamsSchema);
export const validateConfigApplyParams = ajv.compile<ConfigApplyParams>(ConfigApplyParamsSchema);
export const validateConfigPatchParams = ajv.compile<ConfigPatchParams>(ConfigPatchParamsSchema);
export const validateConfigSchemaParams = ajv.compile<ConfigSchemaParams>(ConfigSchemaParamsSchema);
export const validateConfigSetParams = ajv.compile<ConfigSetParams>(ConfigSetParamsSchema);
export const validateWakeParams = ajv.compile<WakeParams>(WakeParamsSchema);

export function formatValidationErrors(errors: ErrorObject[] | null | undefined): string {
    if (!errors || errors.length === 0) return "unknown validation error";

    const formatted = errors.map((err) => {
        let path = err.instancePath;
        if (!path) path = "root";
        if (err.keyword === "additionalProperties" && err.params.additionalProperty) {
            return `at ${path}: unexpected property '${err.params.additionalProperty}'`;
        }
        return `at ${path}: ${err.message}`;
    });

    return Array.from(new Set(formatted)).join(", ");
}
