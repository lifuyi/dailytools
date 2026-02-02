'use client';

import { useState } from 'react';
import { Container, Form, Button, Row, Col, Card, Badge, Alert } from 'react-bootstrap';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Image from 'next/image';

interface ImageResult {
  url: string;
  title: string;
  selected: boolean;
}

export default function Home() {
  const [keyword, setKeyword] = useState('');
  const [images, setImages] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});

  const searchBaiduImages = async () => {
    if (!keyword.trim()) {
      setError('Please enter a keyword');
      return;
    }

    setLoading(true);
    setError('');
    setImages([]);

    try {
      const response = await fetch(`/api/search?keyword=${encodeURIComponent(keyword)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }

      const data = await response.json();

      if (data && data.data) {
        const extractedImages: ImageResult[] = data.data
          .filter((item: any) => item.thumbURL)
          .slice(0, 30)
          .map((item: any) => ({
            url: item.thumbURL,
            title: item.fromPageTitle || keyword,
            selected: false,
          }));

        setImages(extractedImages);

        if (extractedImages.length === 0) {
          setError('No images found. Try a different keyword.');
        }
      } else {
        setError('No images found. Try a different keyword.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (index: number) => {
    const newImages = [...images];
    newImages[index].selected = !newImages[index].selected;
    setImages(newImages);
  };

  const downloadImage = async (imageUrl: string, index: number) => {
    try {
      setDownloadProgress(prev => ({ ...prev, [imageUrl]: 0 }));

      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${keyword}_${index + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadProgress(prev => ({ ...prev, [imageUrl]: 100 }));
      setTimeout(() => {
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[imageUrl];
          return newProgress;
        });
      }, 1000);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download image');
    }
  };

  const downloadSelectedImages = async () => {
    const selectedImages = images.filter(img => img.selected);
    
    if (selectedImages.length === 0) {
      alert('Please select at least one image to download');
      return;
    }

    for (const image of selectedImages) {
      await downloadImage(image.url, images.indexOf(image));
      // Add a small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const selectedCount = images.filter(img => img.selected).length;

  return (
    <Container className="py-5" style={{ maxWidth: '1400px' }}>
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <h1 className="text-center mb-4">Baidu Image Search & Download</h1>
          <Form onSubmit={(e) => { e.preventDefault(); searchBaiduImages(); }}>
            <Row className="g-2">
              <Col md={9}>
                <Form.Control
                  type="text"
                  placeholder="Enter keyword to search images..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  size="lg"
                  className="shadow-sm"
                />
              </Col>
              <Col md={3}>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={searchBaiduImages}
                  disabled={loading}
                  className="w-100 shadow-sm"
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <SearchIcon className="me-2" />
                      Search
                    </>
                  )}
                </Button>
              </Col>
            </Row>
          </Form>
          {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
        </Card.Body>
      </Card>

      {selectedCount > 0 && (
        <div className="mb-4">
          <Button
            variant="success"
            size="lg"
            onClick={downloadSelectedImages}
            className="w-100 shadow-sm"
          >
            <DownloadIcon className="me-2" />
            Download {selectedCount} Selected Image{selectedCount > 1 ? 's' : ''}
          </Button>
        </div>
      )}

      {images.length > 0 && (
        <Row className="g-4">
          {images.map((image, index) => (
            <Col key={index} xs={12} sm={6} md={4} lg={3}>
              <Card
                className="h-100 shadow-sm"
                style={{ 
                  cursor: 'pointer',
                  border: image.selected ? '3px solid #0d6efd' : '1px solid #dee2e6',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => toggleSelection(index)}
              >
                <div style={{ position: 'relative', paddingTop: '75%' }}>
                  <img
                    src={image.url}
                    alt={image.title}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  {image.selected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        backgroundColor: '#0d6efd',
                        borderRadius: '50%',
                        padding: '4px',
                        zIndex: 10,
                      }}
                    >
                      <CheckCircleIcon style={{ color: 'white', fontSize: '24px' }} />
                    </div>
                  )}
                </div>
                <Card.Body className="p-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted text-truncate" style={{ maxWidth: '70%' }}>
                      Image {index + 1}
                    </small>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadImage(image.url, index);
                      }}
                      disabled={downloadProgress[image.url] !== undefined}
                    >
                      {downloadProgress[image.url] !== undefined ? (
                        <span className="spinner-border spinner-border-sm" />
                      ) : (
                        <DownloadIcon style={{ fontSize: '18px' }} />
                      )}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {images.length === 0 && !loading && !error && (
        <div className="text-center text-muted mt-5">
          <SearchIcon style={{ fontSize: '64px', opacity: 0.3 }} />
          <p className="mt-3">Enter a keyword above to start searching for images</p>
        </div>
      )}
    </Container>
  );
}