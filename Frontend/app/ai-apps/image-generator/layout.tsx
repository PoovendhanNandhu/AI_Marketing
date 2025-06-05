import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Image Generator - AI Marketing Tools',
  description: 'Create stunning AI-generated images with Google Imagen for your marketing needs',
};

export default function ImageGeneratorLayout({
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