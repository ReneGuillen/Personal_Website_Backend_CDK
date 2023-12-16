import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as core from 'aws-cdk-lib/core';

export class BackendCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
   
   // DynamoDB tables
   const matchTable = new dynamodb.Table(this, 'MatchTable', {
    tableName: 'Favorite-Team-Matches',
    partitionKey: {
      name: 'uniqueId',
      type: dynamodb.AttributeType.STRING,
    },
    sortKey: {
      name: 'matchDateAndTime',
      type: dynamodb.AttributeType.STRING,
    },
    removalPolicy: core.RemovalPolicy.DESTROY, // Use with caution, as this will delete the table and all its data if the stack is deleted
  });

  const teamTable = new dynamodb.Table(this, 'TeamTable', {
    tableName: 'All-Soccer-Teams',
    partitionKey: {
      name: 'uniqueId',
      type: dynamodb.AttributeType.STRING,
    },
    removalPolicy: core.RemovalPolicy.DESTROY, // Use with caution, as this will delete the table and all its data if the stack is deleted
  });

  // IAM role for Lambda
  const lambdaRole = new iam.Role(this, 'LambdaRole', {
    assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  });

  const customLambdaPolicy = new iam.Policy(this, 'CustomLambdaPolicy', {
    statements: [
        // Add your custom policy statements here.
        new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
            resources: ['arn:aws:logs:*:*:*'],
        }),
    ],
});

lambdaRole.attachInlinePolicy(customLambdaPolicy);

  // Grant DynamoDB read and write permissions to Lambda role
  matchTable.grantReadWriteData(lambdaRole);
  teamTable.grantReadWriteData(lambdaRole);

  // Lambda function
  // Lambda function
  const myLambda = new lambda.Function(this, 'MyLambda', {
    runtime: lambda.Runtime.JAVA_17,
    handler: 'org.recorder.service.SoccerRecorderHandler::handleRequest',
    code: lambda.Code.fromAsset('C:/Users/ReneJ/Projects/personal_website/backendJava/build/distributions/backendJava-1.0-SNAPSHOT.zip'),
    memorySize: 512,
    timeout: cdk.Duration.minutes(2),
    role: lambdaRole
  });

  // CloudWatch Events rule to trigger Lambda every Monday at 5 AM UTC
  const rule = new events.Rule(this, 'WeeklyLambdaTriggerRule', {
    schedule: events.Schedule.cron({
      minute: '0',
      hour: '5',
      weekDay: 'MON',
    }),
  });

  // Add Lambda as a target for the CloudWatch Events rule
  rule.addTarget(new targets.LambdaFunction(myLambda));

  }
}
