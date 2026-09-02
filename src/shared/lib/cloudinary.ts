export async function uploadImageToCloudinary(file: File): Promise<string> {
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloud || !preset) {
        throw new Error("Cloudinary chưa được cấu hình");
    }

    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", preset);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
        { method: "POST", body: form },
    );
    if (!res.ok) {
        throw new Error(`Tải ảnh lên thất bại (${res.status})`);
    }

    const data = (await res.json()) as { secure_url?: string };
    if (!data.secure_url) {
        throw new Error("Cloudinary không trả về URL ảnh");
    }
    return data.secure_url;
}
