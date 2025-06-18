import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Image Generation - AI Marketing Tools',
  description: 'Create stunning AI-generated images with Google Imagen for your marketing needs',
};

export default function ImageGenerationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section>
      {children}
    </section>
  );
} 