import * as lambda from "aws-cdk-lib/aws-lambda"
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"
import * as cdk from "aws-cdk-lib"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import * as ssm from "aws-cdk-lib/aws-ssm"
import { Construct } from "constructs"

export class ProductAppStack extends cdk.Stack {

    readonly productsFetchHandler: lambdaNodeJS.NodejsFunction
    readonly productsAdminHandler: lambdaNodeJS.NodejsFunction
    readonly productsDdb: dynamodb.Table

    constructor(scope: Construct, id: string, props?: cdk.StackProps){
        super(scope, id, props)

        this.productsDdb = new dynamodb.Table(this, "ProudctDdb", {
            tableName: "products",
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            partitionKey: {
                name: "id",
                type: dynamodb.AttributeType.STRING
            },
            billingMode: dynamodb.BillingMode.PROVISIONED,
            readCapacity: 1,
            writeCapacity: 1,
        })

        //Products Layer
        const productsLayerArn = ssm.StringParameter.valueForStringParameter(this, "ProductsLayerVersionArn")
        const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ProductsLayerVersionArn", productsLayerArn)


        this.productsFetchHandler = new lambdaNodeJS.NodejsFunction(this, "ProductsFetchFunction", {
            functionName: "ProductsFetchFunction",
            entry: "lambda/products/productsFetchFunction.ts",
            handler: "handler",
            memorySize: 128,
            timeout: cdk.Duration.seconds(5),
            bundling: {
                minify: true,
                sourceMap: false,
            },
            environment: {
                PRODUCTS_DDB: this.productsDdb.tableName
            },
            layers: [productsLayer],
            runtime: lambda.Runtime.NODEJS_14_X,
        })

        this.productsDdb.grantReadData(this.productsFetchHandler)


        this.productsAdminHandler = new lambdaNodeJS.NodejsFunction(this, "ProductsAdminFunction", {
            functionName: "ProductsAdminFunction",
            entry: "lambda/products/productsAdminFunction.ts",
            handler: "handler",
            memorySize: 128,
            timeout: cdk.Duration.seconds(5),
            bundling: {
                minify: true,
                sourceMap: false,
            },
            environment: {
                PRODUCTS_DDB: this.productsDdb.tableName
            },
            layers: [productsLayer],
            runtime: lambda.Runtime.NODEJS_14_X,
        }) 

        this.productsDdb.grantWriteData(this.productsAdminHandler)
    }
}