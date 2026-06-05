"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import {
  Button,
  Collapse,
  Drawer,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Upload,
  message,
} from "antd";
import type { UploadProps } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  InfoCircleOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { IPhoto } from "@/app/model/photo";
import { photosBusiness } from "@/app/business/photos";
import { exifBusiness } from "@/app/business/exif";
import PhotoInfo from "@/app/album/components/PhotoInfo";

const { Panel } = Collapse;

const createEmptyPhoto = (): IPhoto => ({
  type: "image",
  src: "",
  width: 4,
  height: 3,
  title: "",
  location: "",
  exif: {},
  imageAnalysis: undefined,
  date: new Date().toISOString().split("T")[0],
});

function isVideoPhoto(photo: Pick<IPhoto, "type" | "src">) {
  return photo.type === "video" || /\.(mp4|webm|ogg|mov|m4v)$/i.test(photo.src);
}

export default function PhotosManagementPage() {
  const [photos, setPhotos] = useState<IPhoto[]>([]);
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<{ photo: IPhoto } | null>(null);
  const [newPhoto, setNewPhoto] = useState<IPhoto>(createEmptyPhoto);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [showPhotoInfo, setShowPhotoInfo] = useState(false);
  const [selectedPhotoForInfo, setSelectedPhotoForInfo] = useState<IPhoto | null>(null);

  useEffect(() => {
    void fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const result = await photosBusiness.getPhotos();
      setPhotos(result);
    } catch (error) {
      console.error("Error fetching photos:", error);
      message.error("获取相册失败，请重试");
    }
  };

  const resetAddForm = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl("");
    setNewPhoto(createEmptyPhoto());
  };

  const showPhotoDetails = (photo: IPhoto) => {
    setSelectedPhotoForInfo(photo);
    setShowPhotoInfo(true);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const isVideo = file.type.startsWith("video/");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("directory", isVideo ? "photos/videos" : "photos");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error("No URL returned from upload");
      }

      return data.url as string;
    } finally {
      setIsUploading(false);
    }
  };

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1.9,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: file.type,
      initialQuality: 0.8,
    };

    const compressedFile = await imageCompression(file, options);
    return new File([compressedFile], file.name, { type: compressedFile.type || file.type });
  };

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(objectUrl);
      };
      img.onerror = () => {
        reject(new Error("图片读取失败"));
        URL.revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;
    });
  };

  const handleFileSelect = async (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      message.error("请选择图片或视频文件");
      return;
    }

    if (file.size > 300 * 1024 * 1024) {
      message.error("文件不能超过 300M");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const url = URL.createObjectURL(file);
    const defaultTitle = file.name.replace(/\.[^/.]+$/, "");

    setSelectedFile(file);
    setPreviewUrl(url);

    if (isVideo) {
      setNewPhoto((prev) => ({
        ...prev,
        type: "video",
        width: 16,
        height: 9,
        title: prev.title || defaultTitle,
        exif: {},
        imageAnalysis: undefined,
      }));
      message.success("视频已选择");
      return;
    }

    try {
      const dimensions = await getImageDimensions(file);
      message.info("正在分析 EXIF 和影调信息...");

      let imageAnalysis = null;
      try {
        const analysisFormData = new FormData();
        analysisFormData.append("file", file);
        const analysisResponse = await fetch("/api/image-analysis", {
          method: "POST",
          body: analysisFormData,
        });
        const analysisResult = await analysisResponse.json();
        if (analysisResult.success) {
          imageAnalysis = analysisResult.data.analysis;
        }
      } catch (analysisError) {
        console.warn("影调分析失败:", analysisError);
      }

      const exifResult = await exifBusiness.extractExifFromFile(file);
      setNewPhoto((prev) => ({
        ...prev,
        type: "image",
        width: dimensions.width,
        height: dimensions.height,
        title: prev.title || defaultTitle,
        exif: exifResult.success && exifResult.exif ? exifResult.exif : {},
        imageAnalysis: imageAnalysis || undefined,
      }));

      if (exifResult.success || imageAnalysis) {
        message.success("照片已选择，分析完成");
      } else {
        message.warning("照片已选择，但未读取到 EXIF 或影调分析信息");
      }
    } catch (error: any) {
      console.error("Error processing image:", error);
      message.error(error.message || "处理图片时出错");
    }
  };

  const handleAddPhoto = async () => {
    if (!selectedFile) {
      message.error("请选择要上传的图片或视频");
      return;
    }

    if (!newPhoto.title.trim()) {
      message.error("请输入标题");
      return;
    }

    const isVideo = selectedFile.type.startsWith("video/");

    try {
      setIsCompressing(!isVideo);
      setIsUploading(true);

      let fileToUpload = selectedFile;
      if (!isVideo && selectedFile.size > 1.9 * 1024 * 1024) {
        fileToUpload = await compressImage(selectedFile);
      }

      const url = await uploadFile(fileToUpload);
      const mediaType: IPhoto["type"] = isVideo ? "video" : "image";
      const photoToAdd = {
        ...newPhoto,
        type: mediaType,
        src: url,
        location: newPhoto.location.trim() || "未知地点",
        exif: isVideo ? undefined : newPhoto.exif,
        imageAnalysis: isVideo ? undefined : newPhoto.imageAnalysis,
      };

      await photosBusiness.createPhoto(photoToAdd);
      message.success(isVideo ? "视频添加成功" : "照片添加成功");
      await fetchPhotos();
      setShowAddPhoto(false);
      resetAddForm();
    } catch (error: any) {
      console.error("Error adding media:", error);
      message.error(error.message || "添加失败，请重试");
    } finally {
      setIsCompressing(false);
      setIsUploading(false);
    }
  };

  const handleEditPhoto = async () => {
    if (!editingPhoto?.photo.src || !editingPhoto.photo.title) {
      message.error("请填写链接和标题");
      return;
    }

    try {
      await photosBusiness.updatePhoto(editingPhoto.photo);
      await fetchPhotos();
      setEditingPhoto(null);
      message.success("更新成功");
    } catch (error) {
      console.error("Error updating media:", error);
      message.error("更新失败，请重试");
    }
  };

  const handleDeletePhoto = async (id: string) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定要删除这条相册内容吗？此操作不可恢复。",
      okText: "确认",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await photosBusiness.deletePhoto(id);
          await fetchPhotos();
          message.success("删除成功");
        } catch (error: any) {
          console.error("Error deleting media:", error);
          message.error(error.message || "删除失败，请重试");
        }
      },
    });
  };

  const columns = [
    {
      title: "预览",
      dataIndex: "src",
      key: "src",
      render: (src: string, record: IPhoto) =>
        isVideoPhoto(record) ? (
          <video
            src={src}
            className="h-16 w-16 rounded object-cover"
            muted
            preload="metadata"
          />
        ) : (
          <Image
            src={src}
            alt={record.title || "预览"}
            width={64}
            height={64}
            className="h-16 w-16 rounded object-cover"
            priority
          />
        ),
    },
    {
      title: "类型",
      key: "type",
      render: (record: IPhoto) => (
        <Tag color={isVideoPhoto(record) ? "purple" : "blue"}>
          {isVideoPhoto(record) ? "视频" : "照片"}
        </Tag>
      ),
    },
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
    },
    {
      title: "地点",
      dataIndex: "location",
      key: "location",
      ellipsis: true,
    },
    {
      title: "日期",
      dataIndex: "date",
      key: "date",
    },
    {
      title: "尺寸",
      key: "size",
      render: (record: IPhoto) => `${record.width}x${record.height}`,
    },
    {
      title: "分析信息",
      key: "analysisInfo",
      render: (record: IPhoto) => {
        if (isVideoPhoto(record)) {
          return <span className="text-gray-400">视频不做 EXIF 分析</span>;
        }

        return (
          <div className="space-y-1 text-xs">
            {record.exif?.Make && record.exif?.Model ? (
              <div>{record.exif.Make} {record.exif.Model}</div>
            ) : (
              <span className="text-gray-400">无 EXIF 信息</span>
            )}
            {record.imageAnalysis ? (
              <div className="border-t border-gray-200 pt-1 text-blue-600">
                {record.imageAnalysis.toneAnalysis.type}
              </div>
            ) : (
              <div className="border-t border-gray-200 pt-1 text-gray-400">
                无影调分析
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "操作",
      key: "action",
      render: (record: IPhoto) => (
        <Space direction="vertical" size="small">
          {!isVideoPhoto(record) && (
            <Button
              icon={<InfoCircleOutlined />}
              onClick={() => showPhotoDetails(record)}
              size="small"
            >
              详情
            </Button>
          )}
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => setEditingPhoto({ photo: { ...record } })}
            size="small"
          >
            编辑
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => record._id && handleDeletePhoto(record._id.toString())}
            size="small"
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      void handleFileSelect(file);
      return false;
    },
    showUploadList: false,
    accept: "image/*,video/*",
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">相册管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            支持照片和视频上传；照片会自动提取 EXIF 并进行影调分析。
          </p>
        </div>
        <Button type="primary" onClick={() => setShowAddPhoto(true)}>
          添加内容
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={photos}
        rowKey={(record) => record._id?.toString() || record.src}
        pagination={false}
      />

      <Modal
        title="添加相册内容"
        open={showAddPhoto}
        onCancel={() => {
          setShowAddPhoto(false);
          resetAddForm();
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setShowAddPhoto(false);
              resetAddForm();
            }}
          >
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleAddPhoto}
            disabled={isUploading || isCompressing || !selectedFile || !newPhoto.title}
            loading={isUploading || isCompressing}
          >
            确定
          </Button>,
        ]}
        width={640}
      >
        <div className="space-y-4">
          <Upload.Dragger {...uploadProps} disabled={isUploading || isCompressing}>
            {!previewUrl ? (
              <>
                <p className="ant-upload-drag-icon">
                  <UploadOutlined />
                </p>
                <p className="ant-upload-text">点击选择图片或视频，或拖拽到这里</p>
                <p className="ant-upload-hint">
                  图片会自动压缩和分析；视频最大 300M。
                </p>
              </>
            ) : isVideoPhoto(newPhoto) ? (
              <video
                src={previewUrl}
                controls
                className="mx-auto max-h-64 max-w-full rounded-lg"
                preload="metadata"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Preview"
                className="mx-auto max-h-64 max-w-full rounded-lg object-contain"
              />
            )}
          </Upload.Dragger>

          <Input
            placeholder="请输入标题"
            value={newPhoto.title}
            onChange={(e) => setNewPhoto({ ...newPhoto, title: e.target.value })}
            disabled={isUploading || isCompressing}
          />
          <Input
            placeholder="请输入地点，例如：杭州、西湖、家中"
            value={newPhoto.location}
            onChange={(e) => setNewPhoto({ ...newPhoto, location: e.target.value })}
          />

          <div className="flex gap-4">
            <Input type="number" placeholder="宽度" value={newPhoto.width} readOnly disabled />
            <Input type="number" placeholder="高度" value={newPhoto.height} readOnly disabled />
            <Input
              type="date"
              value={newPhoto.date}
              onChange={(e) => setNewPhoto({ ...newPhoto, date: e.target.value })}
            />
          </div>

          {!isVideoPhoto(newPhoto) &&
            ((newPhoto.exif && Object.keys(newPhoto.exif).length > 0) ||
              newPhoto.imageAnalysis) && (
              <Collapse size="small">
                {newPhoto.exif && Object.keys(newPhoto.exif).length > 0 && (
                  <Panel header="EXIF 拍摄信息" key="exif">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {newPhoto.exif.Make && newPhoto.exif.Model && (
                        <div><strong>相机:</strong> {newPhoto.exif.Make} {newPhoto.exif.Model}</div>
                      )}
                      {newPhoto.exif.LensModel && (
                        <div><strong>镜头:</strong> {newPhoto.exif.LensModel}</div>
                      )}
                      {newPhoto.exif.FocalLength && (
                        <div><strong>焦距:</strong> {newPhoto.exif.FocalLength}</div>
                      )}
                      {newPhoto.exif.Aperture && (
                        <div><strong>光圈:</strong> f/{newPhoto.exif.Aperture}</div>
                      )}
                      {newPhoto.exif.ShutterSpeed && (
                        <div><strong>快门:</strong> {newPhoto.exif.ShutterSpeed}</div>
                      )}
                      {newPhoto.exif.ISO && <div><strong>ISO:</strong> {newPhoto.exif.ISO}</div>}
                    </div>
                  </Panel>
                )}
                {newPhoto.imageAnalysis && (
                  <Panel header="影调分析结果" key="imageAnalysis">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <strong>影调类型:</strong>
                        <span className="font-medium text-blue-600">
                          {newPhoto.imageAnalysis.toneAnalysis.type}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <strong>置信度:</strong>
                        <span>{Math.round(newPhoto.imageAnalysis.toneAnalysis.confidence * 100)}%</span>
                      </div>
                    </div>
                  </Panel>
                )}
              </Collapse>
            )}
        </div>
      </Modal>

      <Modal
        title="编辑相册内容"
        open={!!editingPhoto}
        onCancel={() => setEditingPhoto(null)}
        footer={[
          <Button key="cancel" onClick={() => setEditingPhoto(null)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleEditPhoto}>
            确定
          </Button>,
        ]}
        width={520}
      >
        {editingPhoto && (
          <div className="space-y-4">
            <Input
              value={editingPhoto.photo.src}
              onChange={(e) =>
                setEditingPhoto({
                  ...editingPhoto,
                  photo: { ...editingPhoto.photo, src: e.target.value },
                })
              }
            />
            <Input
              value={editingPhoto.photo.title}
              onChange={(e) =>
                setEditingPhoto({
                  ...editingPhoto,
                  photo: { ...editingPhoto.photo, title: e.target.value },
                })
              }
            />
            <Input
              value={editingPhoto.photo.location}
              onChange={(e) =>
                setEditingPhoto({
                  ...editingPhoto,
                  photo: { ...editingPhoto.photo, location: e.target.value },
                })
              }
            />
            <Input
              type="date"
              value={editingPhoto.photo.date}
              onChange={(e) =>
                setEditingPhoto({
                  ...editingPhoto,
                  photo: { ...editingPhoto.photo, date: e.target.value },
                })
              }
            />
            <div className="flex gap-4">
              <Input
                type="number"
                value={editingPhoto.photo.width}
                onChange={(e) =>
                  setEditingPhoto({
                    ...editingPhoto,
                    photo: { ...editingPhoto.photo, width: Number(e.target.value) },
                  })
                }
              />
              <Input
                type="number"
                value={editingPhoto.photo.height}
                onChange={(e) =>
                  setEditingPhoto({
                    ...editingPhoto,
                    photo: { ...editingPhoto.photo, height: Number(e.target.value) },
                  })
                }
              />
            </div>
          </div>
        )}
      </Modal>

      <Drawer
        title="照片详细信息"
        placement="right"
        onClose={() => setShowPhotoInfo(false)}
        open={showPhotoInfo}
        width={500}
      >
        {selectedPhotoForInfo && <PhotoInfo photo={selectedPhotoForInfo} />}
      </Drawer>
    </div>
  );
}
