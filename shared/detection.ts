export type AwsError = { id: string; service: string; title: string; message: string; severity: 'low' | 'medium' | 'high'; detectedAt: string; pageUrl: string };

const rules: Array<{service:string; pattern:RegExp; title:string; severity:AwsError['severity']}> = [
 {service:'IAM',pattern:/AccessDenied|Access Denied|not authorized to perform|UnauthorizedOperation/i,title:'Permission denied',severity:'high'},
 {service:'CloudFormation',pattern:/CREATE_FAILED|UPDATE_FAILED|ROLLBACK_COMPLETE|Stack.*failed/i,title:'Stack deployment failed',severity:'high'},
 {service:'Lambda',pattern:/Task timed out|Runtime\.\w+Error|Unhandled exception|FunctionError/i,title:'Lambda execution error',severity:'high'},
 {service:'EC2',pattern:/InvalidInstanceID|InsufficientInstanceCapacity|InstanceLimitExceeded/i,title:'EC2 operation failed',severity:'medium'},
 {service:'S3',pattern:/NoSuchBucket|BucketAlreadyExists|InvalidAccessKeyId/i,title:'S3 request failed',severity:'medium'},
 {service:'Networking',pattern:/Target.*unhealthy|Health checks failed|Connection timed out|Network unreachable/i,title:'Connectivity or health check issue',severity:'medium'},
 {service:'AWS Console',pattern:/An error occurred|Something went wrong|InternalError|ServiceUnavailable/i,title:'AWS service error',severity:'medium'},
];

export function redact(text:string):string {
 return text.replace(/(AKIA[0-9A-Z]{16})/g,'[REDACTED_ACCESS_KEY]')
 .replace(/(aws_secret_access_key|secretAccessKey|password|token|authorization)\s*[:=]\s*[^\s,;]+/gi,'$1=[REDACTED]')
 .replace(/\b\d{12}\b/g,'[REDACTED_ACCOUNT_ID]');
}

export function detectAwsError(text:string,url:string):AwsError|null {
 const clean = redact(text).replace(/\s+/g,' ').trim();
 if (!clean || clean.length < 12) return null;
 const rule = rules.find(r=>r.pattern.test(clean));
 if (!rule) return null;
 return {id:crypto.randomUUID(),service:rule.service,title:rule.title,message:clean.slice(0,700),severity:rule.severity,detectedAt:new Date().toISOString(),pageUrl:url};
}
