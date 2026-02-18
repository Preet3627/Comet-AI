import os
import tempfile
import zipfile
from fastapi.testclient import TestClient
from fastapi import UploadFile
import pytest

from api.main import app


client = TestClient(app)


def create_sample_pptx():
    """Create a minimal PPTX file for testing."""
    # This creates a very basic PPTX structure for testing
    pptx_content = {
        '[Content_Types].xml': '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="xml" ContentType="application/xml"/>
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
    <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>''',
        '_rels/.rels': '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>''',
        'ppt/presentation.xml': '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
    <p:sldMasterIdLst/>
    <p:sldIdLst>
        <p:sldId id="256" r:id="rId2"/>
    </p:sldIdLst>
    <p:sldSz cx="9144000" cy="6858000"/>
</p:presentation>''',
        'ppt/_rels/presentation.xml.rels': '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>''',
        'ppt/slides/slide1.xml': '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
    <p:cSld>
        <p:spTree>
            <p:nvGrpSpPr>
                <p:cNvPr id="1" name=""/>
                <p:cNvGrpSpPr/>
                <p:nvPr/>
            </p:nvGrpSpPr>
            <p:grpSpPr>
                <a:xfrm xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                    <a:off x="0" y="0"/>
                    <a:ext cx="0" cy="0"/>
                    <a:chOff x="0" y="0"/>
                    <a:chExt cx="0" cy="0"/>
                </a:xfrm>
            </p:grpSpPr>
        </p:spTree>
    </p:cSld>
    <p:clrMapOvr>
        <a:masterClrMapping xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>
    </p:clrMapOvr>
</p:sld>'''
    }
    
    with tempfile.NamedTemporaryFile(suffix='.pptx', delete=False) as temp_file:
        with zipfile.ZipFile(temp_file.name, 'w') as zip_file:
            for path, content in pptx_content.items():
                zip_file.writestr(path, content)
        return temp_file.name


def test_pptx_slides_processing():
    """Test the PPTX slides processing endpoint."""
    
    # Create a sample PPTX file
    pptx_path = create_sample_pptx()
    
    try:
        with open(pptx_path, 'rb') as pptx_file:
            files = {'pptx_file': ('test.pptx', pptx_file, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')}
            
            response = client.post("/api/v1/ppt/pptx-slides/process", files=files)
            
        # Check response
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] == True
        assert 'slides' in data
        assert 'total_slides' in data
        assert data['total_slides'] > 0
        
        # Check slide data structure
        if data['slides']:
            slide = data['slides'][0]
            assert 'slide_number' in slide
            assert 'screenshot_url' in slide
            assert 'xml_content' in slide
            assert slide['slide_number'] == 1
            assert slide['xml_content'] != ''
        
        print(f"✅ Test passed! Processed {data['total_slides']} slides successfully")
        
    finally:
        # Clean up
        if os.path.exists(pptx_path):
            os.unlink(pptx_path)


def test_invalid_file_type():
    """Test that non-PPTX files are rejected."""
    
    # Create a text file and try to upload it
    with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as temp_file:
        temp_file.write(b"This is not a PPTX file")
        temp_file.flush()
        
        try:
            with open(temp_file.name, 'rb') as txt_file:
                files = {'pptx_file': ('test.txt', txt_file, 'text/plain')}
                
                response = client.post("/api/v1/ppt/pptx-slides/process", files=files)
                
            # Should return 400 for invalid file type
            assert response.status_code == 400
            data = response.json()
            assert 'Invalid file type' in data['detail']
            
            print("✅ Invalid file type test passed!")
            
        finally:
            os.unlink(temp_file.name)


if __name__ == "__main__":
    print("Running PPTX slides processing tests...")
    test_pptx_slides_processing()
    test_invalid_file_type()
    print("🎉 All tests completed!") 