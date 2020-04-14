- [Setup](#setup)
  - [AWS Authentication](#aws-authentication)
  - [Local DNS resolver](#local-dns-resolver)
  - [Run the gateway locally](#run-the-gateway-locally)
- [Deployments](#deployments)
  - [Regions](#regions)
  - [Stages](#stages)
  - [Example Deployment](#example-deployment)
  - [Distribution endpoints](#distribution-endpoints)
  - [Terraform ACM + CDN](#terraform-acm--cdn)

## Setup

### AWS Authentication

**Arweave team account**: 82613677919

**Service sub-account**: 384386061638

1. Setup IAM user with MFA in the AWS console under the main Arweave team account.

2. Configure `~/.aws/config`

```
[default]
region = eu-west-2

[profile arweave]
duration_seconds = 3600
mfa_serial=arn:aws:iam::826136779190:mfa/XXX


[profile arweave-gateway-dev]
region=eu-west-2
parent_profile = arweave
source_profile = arweave
role_arn = arn:aws:iam::384386061638:role/arweave-developer
output=json
```

3. Install AWS CLI\
   `brew install awscli`

4. Install aws-vault\
   `brew install aws-vault`

5. Add main arweave profile, this will prompt for access keys associated with the `arweave` profile IAM user\
   `aws-vault add arweave`

6. Start a bash session using the `arweave-gateway-dev` profile with temporary credentials\
   `aws-vault exec arweave-gateway-dev`

   From this `aws-vault` session we can run commands like `npm run start` and `npm run deploy` that interact with AWS resources.

### Local DNS resolver

To test teh gateway locally we need to setup a local DNS resolver for `arweave.localhost`

`brew install dnsmasq`

`mkdir -pv $(brew —-prefix)/etc/`

`echo 'address=/.localhost/127.0.0.1' >> $(brew --prefix)/etc/dnsmasq.conf`
`echo 'port=53' >> $(brew --prefix)/etc/dnsmasq.conf`

`sudo mkdir -v /etc/resolver`

`sudo bash -c 'echo "nameserver 127.0.0.1" > /etc/resolver/localhost'`

Sudo is required to start dnsmasq as it needs to bind to a privileged port (53).

`sudo brew services start dnsmasq`

### Run the gateway locally

`aws-vault exec arweave-gateway-dev`

`npm run start`\
`npm run start -- --region :region --stage :stage`

**Defaults**

`:stage`: `dev`\
`:region`: `eu-west-2`

`open http://arweave.localhost:3000/dev/info`

## Deployments

Use the double dash `--` to pass params directly to serverless\
`npm run deploy -- --region :region --stage :stage`

**Defaults**

`:stage`: `dev`\
`:region`: `eu-west-2`

### Regions

`us-east-2` (Ohio), `eu-west-2` (London), `ap-southeast-1` (Singapore)

### Stages

`dev`, `test`, `prod`

### Example Deployment

```
Serverless: Warning: S3 Transfer Acceleration will not be enabled on deploymentBucket.
Serverless: Using deployment bucket 'gateway-test-ap-southeast-1-deploys'
Serverless: Packaging service...
Serverless: Excluding development dependencies...
Serverless: Installing dependencies for custom CloudFormation resources...
Serverless: Uploading CloudFormation file to S3...
Serverless: Using S3 Transfer Acceleration Endpoint...
Serverless: Uploading artifacts...
Serverless: Uploading service gateway-test.zip file to S3 (5.85 MB)...
Serverless: Using S3 Transfer Acceleration Endpoint...
Serverless: Uploading custom CloudFormation resources...
Serverless: Using S3 Transfer Acceleration Endpoint...
Serverless: Validating template...
Serverless: Updating Stack...
Serverless: Checking Stack update progress...
..............................................
Serverless: Stack update finished...
Service Information
service: gateway-test
stage: dev
region: ap-southeast-1
stack: gateway-test-dev
resources: 25
api keys:
  None
endpoints:
  ANY - https://opzcp00zl1.execute-api.ap-southeast-1.amazonaws.com/dev/arql
  ANY - https://opzcp00zl1.execute-api.ap-southeast-1.amazonaws.com/dev/graphql
  ANY - https://opzcp00zl1.execute-api.ap-southeast-1.amazonaws.com/dev/{proxy+}
functions:
  arql: gateway-test-dev-arql
  graphql: gateway-test-dev-graphql
  api: gateway-test-dev-api
layers:
  None
Serverless: Updated basepath mapping.
Serverless Domain Manager Summary
Distribution Domain Name
  Target Domain: d-x5s6ol02v5.execute-api.ap-southeast-1.amazonaws.com
  Hosted Zone Id: ZL327KTPIQFUL
Serverless: [serverless-api-gateway-caching] Updating API Gateway cache settings (1 of 1).
Serverless: [serverless-api-gateway-caching] Done updating API Gateway cache settings.
Serverless: Run the "serverless" command to setup monitoring, troubleshooting and testing.
```

### Distribution endpoints

These are the API gateway endpoints directly. They _must_ be invoked with the \$environment path prefix.

```
endpoints:
  ANY - https://opzcp00zl1.execute-api.ap-southeast-1.amazonaws.com/dev/arql
  ANY - https://opzcp00zl1.execute-api.ap-southeast-1.amazonaws.com/dev/graphql
  ANY - https://opzcp00zl1.execute-api.ap-southeast-1.amazonaws.com/dev/{proxy+}
```

In route53, the target domain below should be used as the DNS Alias record for that region.

```
Serverless Domain Manager Summary
Distribution Domain Name
  Target Domain: d-x5s6ol02v5.execute-api.ap-southeast-1.amazonaws.com
  Hosted Zone Id: ZL327KTPIQFUL
```

### Terraform ACM + CDN

1. Manually create a hosted zone in [Route53 console](https://console.aws.amazon.com/route53/home#hosted-zones:) for the domain, e.g. arweave.dev
2. Update NS records to new Route53 hosted zone NS (note: lower the TTL while testing)
3. Provision certificates in [ACM](https://console.aws.amazon.com/acm/home) for the domains defined in `terraform/environments/dev/main.tf`, and run `terraform:dev` to create ACM certificates in the appropriate regions, and a CloudFront distribution.
4. Create a custom domain for API gateway in each required region `npm run init-regional-gateway -- --region <region-id>`
5. Run `npm run deploy -- --region eu-west-2` to create the stack in the region, deploy the api, and connect it to the custom domain.
6. Run `npm run info` to get service info
