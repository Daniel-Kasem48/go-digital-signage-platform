package file

import (
	"bytes"
	"context"
	digitalSignageConfig "digital-signage/internal/config"
	"fmt"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type FileService struct {
	S3Client   *s3.Client
	bucketName string
}

func NewFileService(cfg *digitalSignageConfig.Config) (*FileService, error) {
	s3Client, err := NewS3Client(cfg)
	if err != nil {
		return nil, err
	}

	return &FileService{
		S3Client:   s3Client,
		bucketName: cfg.AWSBucket,
	}, nil
}

func (fileService *FileService) UploadToS3(buffer []byte, filename string, mimetype string) (*s3.PutObjectOutput, error) {
	input := &s3.PutObjectInput{
		Bucket:      aws.String(fileService.bucketName),
		Body:        bytes.NewReader(buffer),
		Key:         aws.String(filename),
		ContentType: aws.String(mimetype),
	}

	result, err := fileService.S3Client.PutObject(context.TODO(), input)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (fileService *FileService) CopyObject(sourcePath string, targetKey string) (*s3.CopyObjectOutput, error) {
	//if sourceBucket == "" {
	//	sourceBucket = fileService.bucketName
	//}

	copySource := fmt.Sprintf("%s/%s", fileService.bucketName, sourcePath)
	input := &s3.CopyObjectInput{
		Bucket:     aws.String(fileService.bucketName),
		CopySource: aws.String(copySource),
		Key:        aws.String(targetKey),
	}

	result, err := fileService.S3Client.CopyObject(context.TODO(), input)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (fileService *FileService) DeleteObject(objectKey string) (*s3.DeleteObjectOutput, error) {
	input := &s3.DeleteObjectInput{
		Bucket: aws.String(fileService.bucketName),
		Key:    aws.String(objectKey),
	}

	result, err := fileService.S3Client.DeleteObject(context.TODO(), input)
	if err != nil {
		return nil, err
	}

	return result, nil
}

// GetFile retrieves a file from MinIO storage
func (fileService *FileService) GetFile(filePath string) ([]byte, string, error) {
	input := &s3.GetObjectInput{
		Bucket: aws.String(fileService.bucketName),
		Key:    aws.String(filePath),
	}

	result, err := fileService.S3Client.GetObject(context.TODO(), input)
	if err != nil {
		return nil, "", err
	}
	defer result.Body.Close()

	// Read the file data
	var buffer bytes.Buffer
	_, err = buffer.ReadFrom(result.Body)
	if err != nil {
		return nil, "", err
	}

	// Get content type
	contentType := ""
	if result.ContentType != nil {
		contentType = *result.ContentType
	}

	return buffer.Bytes(), contentType, nil
}

// SetBucketPublic sets a bucket policy to allow public read access
func (fileService *FileService) SetBucketPublic() error {
	// Public read policy JSON
	policyJSON := fmt.Sprintf(`{
		"Version": "2012-10-17",
		"Statement": [
			{
				"Effect": "Allow",
				"Principal": "*",
				"Action": "s3:GetObject",
				"Resource": "arn:aws:s3:::%s/*"
			}
		]
	}`, fileService.bucketName)

	input := &s3.PutBucketPolicyInput{
		Bucket: aws.String(fileService.bucketName),
		Policy: aws.String(policyJSON),
	}

	_, err := fileService.S3Client.PutBucketPolicy(context.TODO(), input)
	return err
}
