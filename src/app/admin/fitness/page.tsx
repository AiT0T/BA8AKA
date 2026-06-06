"use client";

import { useState, useEffect, useCallback } from "react";
import imageCompression from "browser-image-compression";
import Image from "next/image";
import {
    Button,
    Modal,
    Form,
    Input,
    DatePicker,
    Upload,
    Space,
    Card,
    message,
    Typography,
    Popconfirm,
    Switch,
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    UploadOutlined,
    VideoCameraOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { fitnessBusiness } from "@/app/business/fitness";
import { IFitnessRecord, IFitnessImage, IFitnessVideo } from "@/app/model/fitness";

const { Text, Paragraph } = Typography;
const MAX_VIDEO_SIZE_MB = 300;

export default function FitnessAdmin() {
    const [form] = Form.useForm();
    const [records, setRecords] = useState<IFitnessRecord[]>([]);
    const [editingRecord, setEditingRecord] = useState<IFitnessRecord | null>(null);
    const [expandedDescriptions, setExpandedDescriptions] = useState<{
        [key: number]: boolean;
    }>({});
    const [isUploading, setIsUploading] = useState(false);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
    const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
    const [videoPreviewUrls, setVideoPreviewUrls] = useState<string[]>([]);
    const [isCompressing, setIsCompressing] = useState(false);

    // Fetch records on component mount
    const fetchRecords = useCallback(async () => {
        try {
            const records = await fitnessBusiness.getFitnessRecords();
            setRecords(sortRecords(records));
        } catch (error) {
            console.error("Error fetching fitness records:", error);
            message.error("加载失败，请刷新页面重试");
        }
    }, []);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const handleAddRecord = () => {
        const now = new Date();
        setEditingRecord({
            title: "",
            description: "",
            date: now.toISOString().split('T')[0], // YYYY-MM-DD格式
            images: [],
            videos: [],
        });
        form.resetFields();
        clearMedia();
    };

    const handleEditRecord = (record: IFitnessRecord, index: number) => {
        setEditingRecord({ ...record });
        form.setFieldsValue({
            date: dayjs(record.date),
            title: record.title,
            description: record.description,
            isAdminOnly: record.isAdminOnly || false,
        });
        clearMedia();
    };

    const handleDeleteRecord = async (record: IFitnessRecord) => {
        if (!record._id) return;

        try {
            await fitnessBusiness.deleteFitnessRecord(record._id);
            message.success("删除成功");
            await fetchRecords();
        } catch (error) {
            console.error("Error deleting fitness record:", error);
            message.error("删除失败，请重试");
        }
    };

    const compressImage = async (file: File): Promise<File> => {
        const options = {
            maxSizeMB: 1.9,
            maxWidthOrHeight: 2048,
            useWebWorker: true,
            fileType: file.type,
        };

        try {
            console.log("开始压缩图片...");
            console.log("原始文件大小:", (file.size / 1024 / 1024).toFixed(2), "MB");

            const compressedFile = await imageCompression(file, options);
            console.log(
                "压缩后文件大小:",
                (compressedFile.size / 1024 / 1024).toFixed(2),
                "MB"
            );

            return new File([compressedFile], file.name, {
                type: compressedFile.type,
            });
        } catch (error) {
            console.error("压缩图片时出错:", error);
            throw error;
        }
    };

    const uploadFiles = async (files: File[], directory: string) => {
        const uploadPromises = files.map(async (file) => {
            let fileToUpload = file;

            // Compress images if needed
            if (file.type.startsWith("image/") && file.size > 1.9 * 1024 * 1024) {
                try {
                    fileToUpload = await compressImage(file);
                } catch (error: any) {
                    throw new Error(`图片压缩失败: ${error.message}`);
                }
            }

            const formData = new FormData();
            formData.append("file", fileToUpload);
            formData.append("directory", directory);

            try {
                const response = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `上传失败 (${response.status})`);
                }

                const data = await response.json();
                if (!data.url) {
                    throw new Error("服务器未返回文件URL");
                }

                return data.url;
            } catch (error: any) {
                console.error(`上传文件 ${file.name} 失败:`, error);
                throw new Error(`上传文件 "${file.name}" 失败: ${error.message}`);
            }
        });

        return Promise.all(uploadPromises);
    };

    const handleSaveRecord = async () => {
        try {
            const values = await form.validateFields();
            setIsUploading(true);
            setIsCompressing(true);

            let finalImages = editingRecord?.images || [];
            let finalVideos = editingRecord?.videos || [];

            // Upload new images
            if (selectedImages.length > 0) {
                try {
                    const imageUrls = await uploadFiles(selectedImages, "fitness/images");
                    const newImages: IFitnessImage[] = imageUrls.map(url => ({ url }));
                    finalImages = [...finalImages, ...newImages];
                } catch (error) {
                    console.error("图片上传失败:", error);
                    message.error("图片上传失败，请重试");
                    return;
                }
            }

            // Upload new videos
            if (selectedVideos.length > 0) {
                try {
                    const videoUrls = await uploadFiles(selectedVideos, "fitness/videos");
                    const newVideos: IFitnessVideo[] = videoUrls.map(url => ({ url }));
                    finalVideos = [...finalVideos, ...newVideos];
                } catch (error) {
                    console.error("视频上传失败:", error);
                    message.error("视频上传失败，请重试");
                    return;
                }
            }

            const recordToSave = {
                ...editingRecord,
                title: values.title,
                description: values.description,
                date: values.date.format('YYYY-MM-DD'),
                images: finalImages,
                videos: finalVideos,
                isAdminOnly: values.isAdminOnly || false,
            };

            // 保存记录
            try {
                if (recordToSave._id) {
                    // 更新记录
                    await fitnessBusiness.updateFitnessRecord(recordToSave);
                } else {
                    // 创建记录
                    await fitnessBusiness.createFitnessRecord(recordToSave);
                }

                message.success("保存成功");
                await fetchRecords();
                setEditingRecord(null);
                form.resetFields();
                clearMedia();
            } catch (error: any) {
                console.error("保存健身记录失败:", error);
                const errorMessage = error?.message || "保存失败，请重试";
                message.error(errorMessage);
            }
        } catch (error: any) {
            console.error("处理健身记录时出错:", error);
            const errorMessage = error?.message || "操作失败，请重试";
            message.error(errorMessage);
        } finally {
            setIsUploading(false);
            setIsCompressing(false);
        }
    };

    const clearMedia = () => {
        // Clear preview URLs
        imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
        videoPreviewUrls.forEach(url => URL.revokeObjectURL(url));

        setSelectedImages([]);
        setSelectedVideos([]);
        setImagePreviewUrls([]);
        setVideoPreviewUrls([]);
    };

    const sortRecords = (records: IFitnessRecord[]) => {
        return [...records].sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime(); // 降序排列，最新的在前
        });
    };

    const toggleDescription = (index: number) => {
        setExpandedDescriptions((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Validate file types
        const imageFiles = files.filter(file => file.type.startsWith("image/"));
        if (imageFiles.length !== files.length) {
            message.warning("只能选择图片文件");
            return;
        }

        // Check file size (limit to 10MB per image, will be compressed if needed)
        const oversizedFiles = imageFiles.filter(file => file.size > 10 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            message.warning(`以下图片文件超过10MB限制: ${oversizedFiles.map(f => f.name).join(', ')}`);
            return;
        }

        setSelectedImages(prev => [...prev, ...imageFiles]);

        // Create preview URLs
        const newPreviewUrls = imageFiles.map(file => URL.createObjectURL(file));
        setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
    };

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Validate file types
        const videoFiles = files.filter(file => file.type.startsWith("video/"));
        if (videoFiles.length !== files.length) {
            message.warning("只能选择视频文件");
            return;
        }

        // Check file size (limit to 300MB per video)
        const oversizedFiles = videoFiles.filter(file => file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            message.warning(`以下视频文件超过${MAX_VIDEO_SIZE_MB}MB限制: ${oversizedFiles.map(f => f.name).join(', ')}`);
            return;
        }

        setSelectedVideos(prev => [...prev, ...videoFiles]);

        // Create preview URLs
        const newPreviewUrls = videoFiles.map(file => URL.createObjectURL(file));
        setVideoPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    };

    const removeImage = (index: number, isNew: boolean = true) => {
        if (isNew) {
            // Remove from new images
            URL.revokeObjectURL(imagePreviewUrls[index]);
            setSelectedImages(prev => prev.filter((_, i) => i !== index));
            setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
        } else {
            // Remove from existing images
            if (editingRecord?.images) {
                const newImages = [...editingRecord.images];
                newImages.splice(index, 1);
                setEditingRecord({ ...editingRecord, images: newImages });
            }
        }
    };

    const removeVideo = (index: number, isNew: boolean = true) => {
        if (isNew) {
            // Remove from new videos
            URL.revokeObjectURL(videoPreviewUrls[index]);
            setSelectedVideos(prev => prev.filter((_, i) => i !== index));
            setVideoPreviewUrls(prev => prev.filter((_, i) => i !== index));
        } else {
            // Remove from existing videos
            if (editingRecord?.videos) {
                const newVideos = [...editingRecord.videos];
                newVideos.splice(index, 1);
                setEditingRecord({ ...editingRecord, videos: newVideos });
            }
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <Typography.Title level={2} style={{ margin: 0 }}>
                    健身打卡管理
                </Typography.Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddRecord}
                >
                    添加打卡记录
                </Button>
            </div>

            <div className="space-y-4">
                {records.map((record, index) => (
                    <Card key={index} className="w-full shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col space-y-4">
                            <div className="flex flex-col space-y-2">
                                <Space align="start" className="flex-wrap">
                                    <Text type="secondary" className="whitespace-nowrap">
                                        {record.date}
                                    </Text>
                                    <div className="flex items-center gap-2">
                                        <Typography.Title
                                            level={4}
                                            style={{ margin: 0, maxWidth: '100%' }}
                                            ellipsis={{ tooltip: record.title }}
                                        >
                                            {record.title}
                                        </Typography.Title>
                                        {record.isAdminOnly && (
                                            <div className="flex items-center bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs whitespace-nowrap">
                                                🔒 仅管理员可见
                                            </div>
                                        )}
                                    </div>
                                </Space>

                                {/* 显示图片 */}
                                {record.images && record.images.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                                        {record.images.map((image, imgIndex) => (
                                            <div key={imgIndex} className="relative aspect-square overflow-hidden rounded-lg bg-gray-50">
                                                <Image
                                                    src={image.url}
                                                    alt={image.caption || record.title}
                                                    fill
                                                    className="object-cover"
                                                    sizes="(max-width: 768px) 50vw, 33vw"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* 显示视频 */}
                                {record.videos && record.videos.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        {record.videos.map((video, vidIndex) => (
                                            <div key={vidIndex} className="relative aspect-video overflow-hidden rounded-lg bg-gray-50">
                                                <video
                                                    src={video.url}
                                                    controls
                                                    className="w-full h-full object-cover"
                                                    poster={video.thumbnail}
                                                >
                                                    您的浏览器不支持视频播放
                                                </video>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <Paragraph
                                    ellipsis={
                                        !expandedDescriptions[index]
                                            ? { rows: 3, expandable: true, symbol: "展开" }
                                            : false
                                    }
                                    onClick={() => toggleDescription(index)}
                                    className="text-gray-600 mb-0"
                                >
                                    {record.description}
                                </Paragraph>
                            </div>

                            <Space className="justify-end" wrap>
                                <Button
                                    type="default"
                                    icon={<EditOutlined />}
                                    onClick={() => handleEditRecord(record, index)}
                                >
                                    编辑
                                </Button>
                                <Popconfirm
                                    title="确定要删除这个健身记录吗？"
                                    onConfirm={() => handleDeleteRecord(record)}
                                    okText="确认"
                                    cancelText="取消"
                                >
                                    <Button danger icon={<DeleteOutlined />}>
                                        删除
                                    </Button>
                                </Popconfirm>
                            </Space>
                        </div>
                    </Card>
                ))}
            </div>

            <Modal
                title={editingRecord?._id ? "编辑记录" : "添加记录"}
                open={!!editingRecord}
                onCancel={() => {
                    setEditingRecord(null);
                    form.resetFields();
                    clearMedia();
                }}
                footer={[
                    <Button
                        key="cancel"
                        onClick={() => {
                            setEditingRecord(null);
                            form.resetFields();
                            clearMedia();
                        }}
                    >
                        取消
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        loading={isUploading || isCompressing}
                        onClick={handleSaveRecord}
                    >
                        {isUploading ? "上传中..." : isCompressing ? "处理中..." : "保存"}
                    </Button>,
                ]}
                width={800}
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{
                        date: editingRecord ? dayjs(editingRecord.date) : dayjs(),
                        title: editingRecord?.title || "",
                        description: editingRecord?.description || "",
                        isAdminOnly: editingRecord?.isAdminOnly || false,
                    }}
                >
                    <Form.Item
                        label="日期"
                        name="date"
                        rules={[{ required: true, message: "请选择日期" }]}
                    >
                        <DatePicker style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item
                        label="标题"
                        name="title"
                        rules={[{ required: true, message: "请输入标题" }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="描述"
                        name="description"
                        rules={[{ required: true, message: "请输入描述" }]}
                    >
                        <Input.TextArea rows={4} />
                    </Form.Item>

                    <Form.Item
                        label="仅管理员可见"
                        name="isAdminOnly"
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>

                    {/* 现有图片 */}
                    {editingRecord?.images && editingRecord.images.length > 0 && (
                        <Form.Item label="当前图片">
                            <div className="grid grid-cols-3 gap-2">
                                {editingRecord.images.map((image, index) => (
                                    <div key={index} className="relative">
                                        <Image
                                            src={image.url}
                                            alt="Current"
                                            width={120}
                                            height={120}
                                            className="object-cover rounded"
                                        />
                                        <Button
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            size="small"
                                            className="absolute top-0 right-0"
                                            onClick={() => removeImage(index, false)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </Form.Item>
                    )}

                    {/* 新增图片 */}
                    <Form.Item label="添加图片">
                        <div className="space-y-2">
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleImageChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {imagePreviewUrls.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 mt-2">
                                    {imagePreviewUrls.map((url, index) => (
                                        <div key={index} className="relative">
                                            <Image
                                                src={url}
                                                alt="Preview"
                                                width={120}
                                                height={120}
                                                className="object-cover rounded"
                                            />
                                            <Button
                                                type="text"
                                                danger
                                                icon={<DeleteOutlined />}
                                                size="small"
                                                className="absolute top-0 right-0"
                                                onClick={() => removeImage(index, true)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Form.Item>

                    {/* 现有视频 */}
                    {editingRecord?.videos && editingRecord.videos.length > 0 && (
                        <Form.Item label="当前视频">
                            <div className="grid grid-cols-2 gap-2">
                                {editingRecord.videos.map((video, index) => (
                                    <div key={index} className="relative">
                                        <video
                                            src={video.url}
                                            controls
                                            className="w-full h-32 object-cover rounded"
                                        />
                                        <Button
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            size="small"
                                            className="absolute top-0 right-0"
                                            onClick={() => removeVideo(index, false)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </Form.Item>
                    )}

                    {/* 新增视频 */}
                    <Form.Item label="添加视频">
                        <div className="space-y-2">
                            <input
                                type="file"
                                multiple
                                accept="video/*"
                                onChange={handleVideoChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                            />
                            {videoPreviewUrls.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {videoPreviewUrls.map((url, index) => (
                                        <div key={index} className="relative">
                                            <video
                                                src={url}
                                                controls
                                                className="w-full h-32 object-cover rounded"
                                            />
                                            <Button
                                                type="text"
                                                danger
                                                icon={<DeleteOutlined />}
                                                size="small"
                                                className="absolute top-0 right-0"
                                                onClick={() => removeVideo(index, true)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
