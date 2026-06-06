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
    Space,
    Card,
    message,
    Typography,
    Popconfirm,
    Switch,
    Rate,
    Select,
    InputNumber,
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    EnvironmentOutlined,
    TeamOutlined,
    DollarOutlined,
    StarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { travelBusiness } from "@/app/business/travel";
import { ITravelRecord, ITravelImage, ITravelVideo } from "@/app/model/travel";

const { Text, Paragraph } = Typography;
const { Option } = Select;
const MAX_VIDEO_SIZE_MB = 300;

export default function TravelAdmin() {
    const [form] = Form.useForm();
    const [records, setRecords] = useState<ITravelRecord[]>([]);
    const [editingRecord, setEditingRecord] = useState<ITravelRecord | null>(null);
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
            const records = await travelBusiness.getTravelRecords();
            setRecords(sortRecords(records));
        } catch (error) {
            console.error("Error fetching travel records:", error);
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
            date: now.toISOString().split('T')[0],
            images: [],
            videos: [],
            companions: [],
            tags: [],
        });
        form.resetFields();
        clearMedia();
    };

    const handleEditRecord = (record: ITravelRecord, index: number) => {
        setEditingRecord({ ...record });
        form.setFieldsValue({
            date: dayjs(record.date),
            title: record.title,
            description: record.description,
            destination: record.destination || "",
            weather: record.weather || "",
            companions: record.companions || [],
            transportation: record.transportation || "",
            cost: record.cost || 0,
            rating: record.rating || 0,
            tags: record.tags || [],
            isAdminOnly: record.isAdminOnly || false,
        });
        clearMedia();
    };

    const handleDeleteRecord = async (record: ITravelRecord) => {
        if (!record._id) return;

        try {
            await travelBusiness.deleteTravelRecord(record._id);
            message.success("删除成功");
            await fetchRecords();
        } catch (error) {
            console.error("Error deleting travel record:", error);
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
                    const imageUrls = await uploadFiles(selectedImages, "travel/images");
                    const newImages: ITravelImage[] = imageUrls.map(url => ({ url }));
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
                    const videoUrls = await uploadFiles(selectedVideos, "travel/videos");
                    const newVideos: ITravelVideo[] = videoUrls.map(url => ({ url }));
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
                destination: values.destination || "",
                weather: values.weather || "",
                companions: values.companions || [],
                transportation: values.transportation || "",
                cost: values.cost || 0,
                rating: values.rating || 0,
                images: finalImages,
                videos: finalVideos,
                tags: values.tags || [],
                isAdminOnly: values.isAdminOnly || false,
            };

            // 保存记录
            try {
                if (recordToSave._id) {
                    // 更新记录
                    await travelBusiness.updateTravelRecord(recordToSave);
                } else {
                    // 创建记录
                    await travelBusiness.createTravelRecord(recordToSave);
                }

                message.success("保存成功");
                await fetchRecords();
                setEditingRecord(null);
                form.resetFields();
                clearMedia();
            } catch (error: any) {
                console.error("保存旅行记录失败:", error);
                const errorMessage = error?.message || "保存失败，请重试";
                message.error(errorMessage);
            }
        } catch (error: any) {
            console.error("处理旅行记录时出错:", error);
            const errorMessage = error?.message || "操作失败，请重试";
            message.error(errorMessage);
        } finally {
            setIsUploading(false);
            setIsCompressing(false);
        }
    };

    const clearMedia = () => {
        imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
        videoPreviewUrls.forEach(url => URL.revokeObjectURL(url));

        setSelectedImages([]);
        setSelectedVideos([]);
        setImagePreviewUrls([]);
        setVideoPreviewUrls([]);
    };

    const sortRecords = (records: ITravelRecord[]) => {
        return [...records].sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
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

        const imageFiles = files.filter(file => file.type.startsWith("image/"));
        if (imageFiles.length !== files.length) {
            message.warning("只能选择图片文件");
            return;
        }

        const oversizedFiles = imageFiles.filter(file => file.size > 10 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            message.warning(`以下图片文件超过10MB限制: ${oversizedFiles.map(f => f.name).join(', ')}`);
            return;
        }

        setSelectedImages(prev => [...prev, ...imageFiles]);

        const newPreviewUrls = imageFiles.map(file => URL.createObjectURL(file));
        setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
    };

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const videoFiles = files.filter(file => file.type.startsWith("video/"));
        if (videoFiles.length !== files.length) {
            message.warning("只能选择视频文件");
            return;
        }

        const oversizedFiles = videoFiles.filter(file => file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            message.warning(`以下视频文件超过${MAX_VIDEO_SIZE_MB}MB限制: ${oversizedFiles.map(f => f.name).join(', ')}`);
            return;
        }

        setSelectedVideos(prev => [...prev, ...videoFiles]);

        const newPreviewUrls = videoFiles.map(file => URL.createObjectURL(file));
        setVideoPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    };

    const removeImage = (index: number, isNew: boolean = true) => {
        if (isNew) {
            URL.revokeObjectURL(imagePreviewUrls[index]);
            setSelectedImages(prev => prev.filter((_, i) => i !== index));
            setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
        } else {
            if (editingRecord?.images) {
                const newImages = [...editingRecord.images];
                newImages.splice(index, 1);
                setEditingRecord({ ...editingRecord, images: newImages });
            }
        }
    };

    const removeVideo = (index: number, isNew: boolean = true) => {
        if (isNew) {
            URL.revokeObjectURL(videoPreviewUrls[index]);
            setSelectedVideos(prev => prev.filter((_, i) => i !== index));
            setVideoPreviewUrls(prev => prev.filter((_, i) => i !== index));
        } else {
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
                    旅行记录管理
                </Typography.Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAddRecord}
                >
                    添加旅行记录
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
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Typography.Title
                                            level={4}
                                            style={{ margin: 0, maxWidth: '100%' }}
                                            ellipsis={{ tooltip: record.title }}
                                        >
                                            {record.title}
                                        </Typography.Title>
                                        {record.destination && (
                                            <div className="flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs whitespace-nowrap">
                                                <EnvironmentOutlined className="mr-1" />
                                                {record.destination}
                                            </div>
                                        )}
                                        {record.rating && (
                                            <div className="flex items-center bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs whitespace-nowrap">
                                                <StarOutlined className="mr-1" />
                                                {record.rating}分
                                            </div>
                                        )}
                                        {record.isAdminOnly && (
                                            <div className="flex items-center bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs whitespace-nowrap">
                                                🔒 仅管理员可见
                                            </div>
                                        )}
                                    </div>
                                </Space>

                                {/* 额外信息 */}
                                {(record.weather || record.companions?.length || record.transportation || record.cost) && (
                                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                                        {record.weather && <span>☀️ {record.weather}</span>}
                                        {record.companions && record.companions.length > 0 && (
                                            <span>👥 {record.companions.join(', ')}</span>
                                        )}
                                        {record.transportation && <span>🚗 {record.transportation}</span>}
                                        {record.cost && <span>💰 ¥{record.cost}</span>}
                                    </div>
                                )}

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

                                {/* 标签 */}
                                {record.tags && record.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {record.tags.map((tag, tagIndex) => (
                                            <span
                                                key={tagIndex}
                                                className="inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs"
                                            >
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
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
                                    title="确定要删除这个旅行记录吗？"
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
                width={900}
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{
                        date: editingRecord ? dayjs(editingRecord.date) : dayjs(),
                        title: editingRecord?.title || "",
                        description: editingRecord?.description || "",
                        destination: editingRecord?.destination || "",
                        weather: editingRecord?.weather || "",
                        companions: editingRecord?.companions || [],
                        transportation: editingRecord?.transportation || "",
                        cost: editingRecord?.cost || 0,
                        rating: editingRecord?.rating || 0,
                        tags: editingRecord?.tags || [],
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
                        label="目的地"
                        name="destination"
                    >
                        <Input prefix={<EnvironmentOutlined />} placeholder="旅行目的地" />
                    </Form.Item>

                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item label="天气" name="weather">
                            <Select placeholder="选择天气情况">
                                <Option value="晴天">☀️ 晴天</Option>
                                <Option value="多云">⛅ 多云</Option>
                                <Option value="阴天">☁️ 阴天</Option>
                                <Option value="小雨">🌦️ 小雨</Option>
                                <Option value="大雨">🌧️ 大雨</Option>
                                <Option value="雪天">❄️ 雪天</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item label="交通方式" name="transportation">
                            <Select placeholder="选择交通方式">
                                <Option value="飞机">✈️ 飞机</Option>
                                <Option value="火车">🚄 火车</Option>
                                <Option value="汽车">🚗 汽车</Option>
                                <Option value="轮船">🚢 轮船</Option>
                                <Option value="自驾">🚙 自驾</Option>
                                <Option value="步行">🚶 步行</Option>
                                <Option value="自行车">🚴 自行车</Option>
                            </Select>
                        </Form.Item>
                    </div>

                    <Form.Item label="同行人员" name="companions">
                        <Select
                            mode="tags"
                            placeholder="添加同行人员"
                            style={{ width: "100%" }}
                        />
                    </Form.Item>

                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item label="费用 (¥)" name="cost">
                            <InputNumber
                                min={0}
                                precision={2}
                                prefix={<DollarOutlined />}
                                style={{ width: "100%" }}
                                placeholder="0.00"
                            />
                        </Form.Item>

                        <Form.Item label="评分" name="rating">
                            <Rate />
                        </Form.Item>
                    </div>

                    <Form.Item
                        label="描述"
                        name="description"
                        rules={[{ required: true, message: "请输入描述" }]}
                    >
                        <Input.TextArea rows={4} />
                    </Form.Item>

                    <Form.Item label="标签" name="tags">
                        <Select
                            mode="tags"
                            placeholder="添加标签"
                            style={{ width: "100%" }}
                        />
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
