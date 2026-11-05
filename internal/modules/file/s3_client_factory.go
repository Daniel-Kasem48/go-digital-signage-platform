package file

import (
	"context"
	digitalSignageConfig "digital-signage/internal/config"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsConfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func NewS3Client(cfg *digitalSignageConfig.Config) (*s3.Client, error) {
	loadOptions := []func(*awsConfig.LoadOptions) error{
		awsConfig.WithRegion(cfg.AWSRegion),
	}

	// Non-production environments (e.g. local MinIO) can use static keys.
	// Production should rely on IAM/default AWS credential provider chain.
	if !strings.EqualFold(cfg.AppEnv, "production") && cfg.AWSAccessKeyId != "" && cfg.AWSSecretKey != "" {
		loadOptions = append(loadOptions, awsConfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(cfg.AWSAccessKeyId, cfg.AWSSecretKey, ""),
		))
	}

	awsCfg, err := awsConfig.LoadDefaultConfig(context.Background(), loadOptions...)
	if err != nil {
		return nil, err
	}

	s3Options := []func(*s3.Options){}
	if cfg.AWSEndpoint != "" {
		s3Options = append(s3Options, func(options *s3.Options) {
			options.BaseEndpoint = aws.String(cfg.AWSEndpoint)
			options.UsePathStyle = true
		})
	}

	return s3.NewFromConfig(awsCfg, s3Options...), nil
}
