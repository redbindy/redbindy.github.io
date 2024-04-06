---
layout: post
title: "DirectX11 튜토리얼 정리3: 간단한 쉐이더 활용"
category: 컴퓨터공학
tags: [C/C++, DX11, DirectX11]
---

## 이전 게시글

&emsp;이전 게시글에서 내용과 코드가 이어집니다. 안 보고 오셨다면

### [DirectX11 튜토리얼 정리1: 화면 지우기](/컴퓨터공학/2024/03/20/DX11_ClearScreen.html)
### [DirectX11 튜토리얼 정리2: 삼각형 그리기](/컴퓨터공학/2024/03/29/DX11_DrawTriangle.html)

&emsp;먼저 보시는 것도 추천!

## 결과

![결과 이미지](/assets/images/2024-04-03-DX11_SimpleShader_images/result-ezgif-convertor.gif)

&emsp;3D 관련으로 가기 전에 간단하게 요런 변환을 다뤄봅시다. 볼륨이 적은 게시글이 될 것 같네요.

&emsp;녹화를 잘못했는지 검은 빈 부분이 있는데 거슬리긴 해도 일단 결과 잘 보이니 넘어가는 걸로...ㅋㅋㅋ(~~어차피 저만 보는 게시글이랑 다를바 없으니~~)

## 이번 게시글에서 사용할 전체 코드

**Jekyll 버그인지 코드 부분 부분에서 넣지도 않은 \가 출력되고 있네요. 참고해주십쇼!**

### C++

~~~ C++
#include <Windows.h>
#include <assert.h>

#include <d3d11.h>
#include <dxgi.h>
#include <DirectXMath.h>
#include <d3dcompiler.h>

#pragma comment(lib, "d3d11.lib")
#pragma comment(lib, "dxgi.lib")
#pragma comment(lib, "d3dcompiler.lib")

// 디버깅용 정적 콘솔 연결
#pragma comment(linker, "/entry:wWinMainCRTStartup /subsystem:console")

LRESULT CALLBACK WndProc(const HWND hWnd, const UINT message, const WPARAM wParam, const LPARAM lParam);
void InitializeD3D11();
void DestroyD3D11();
void Render();

HINSTANCE ghInstance;
HWND ghWnd;

const TCHAR* WINDOW_NAME = TEXT("DX11 Sample");

int APIENTRY wWinMain(_In_ HINSTANCE hInstance,
					  _In_opt_ HINSTANCE hPrevInstance,
					  _In_ LPWSTR    lpCmdLine,
					  _In_ int       nCmdShow)
{
	ghInstance = hInstance;

	// 윈도우 클래스 정의 및 등록
	WNDCLASS windowClass;
	ZeroMemory(&windowClass, sizeof(WNDCLASS));

	windowClass.lpfnWndProc = WndProc; // 콜백함수 등록
	windowClass.lpszClassName = WINDOW_NAME; // 클래스 이름 지정
	windowClass.hCursor = (HCURSOR)LoadCursor(nullptr, IDC_ARROW); // 기본 커서 지정
	windowClass.hInstance = hInstance; // 클래스 인스턴스 지정

	RegisterClass(&windowClass);
	assert(GetLastError() == ERROR_SUCCESS);

	// 실제 사용하게 될 화면 크기 지정
	// 여기서는 디스플레이의 가로 / 2, 세로 / 2 사용 예정
	RECT windowRect;
	windowRect.left = 0;
	windowRect.top = 0;
	windowRect.right = GetSystemMetrics(SM_CXSCREEN) >> 1; // 디스플레이 너비 / 2
	windowRect.bottom = GetSystemMetrics(SM_CYSCREEN) >> 1; // 디스플레이 높이 / 2

	AdjustWindowRect(
		&windowRect, // 값을 받을 RECT 구조체 주소
		WS_OVERLAPPEDWINDOW, // 크기를 계산할 때 참고할 윈도우 스타일
		false // 메뉴 여부
	);
	assert(GetLastError() == ERROR_SUCCESS);

	// 윈도우 생성
	ghWnd = CreateWindow(
		WINDOW_NAME, // 클래스 이름
		WINDOW_NAME, // 윈도우 이름
		WS_OVERLAPPEDWINDOW, // 윈도우 스타일
		CW_USEDEFAULT, CW_USEDEFAULT, // (x, y)
		windowRect.right, windowRect.bottom, // 너비, 높이
		nullptr, // 부모 윈도우 지정
		nullptr, // 메뉴 지정
		hInstance, // 인스턴스 지정
		nullptr // 추가 메모리 지정
	);
	assert(GetLastError() == ERROR_SUCCESS);
	InitializeD3D11(); // 윈도우 만들고 나서 D3D 초기화

	// 윈도우 보여주기
	ShowWindow(ghWnd, nCmdShow);
	assert(GetLastError() == ERROR_SUCCESS);

	// PeekMessage를 이용한 메시지 루프
	MSG msg;
	while (true)
	{
		if (PeekMessage(
			&msg, // 메시지를 받을 주소
			nullptr, // 메시지를 받을 윈도우
			0, // 받을 메시지 범위 최솟값
			0, // 받을 메시지 범위 최댓값
			PM_REMOVE // 메시지 처리 방법
		))
		{
			if (msg.message == WM_QUIT)
			{
				break;
			}

			TranslateMessage(&msg); // 메시지 문자로 해석 시도
			DispatchMessage(&msg); // 메시지 전달
		}
		else
		{
			Render();
			Sleep(1000 / 30);
		}
	}

	return (int)msg.wParam;
}

// 윈도우 콜백 함수
LRESULT CALLBACK WndProc(const HWND hWnd, const UINT message, const WPARAM wParam, const LPARAM lParam)
{
	switch (message)
	{
	case WM_DESTROY: // 윈도우 종료시 자원 해제 작업
		DestroyD3D11();
		PostQuitMessage(0);
		break;

	default:
		return DefWindowProc(hWnd, message, wParam, lParam);
	}

	return 0;
}

// 번거로움 피하기
using namespace DirectX;

// 사용할 정점 구조체
// 위치 정보 외에도 다양한 데이터가 추가될 수 있음
typedef struct
{
	XMFLOAT3 pos; // 단순 (x, y, z)를 표현하기 위해 float3 사용
} vertex_t;

typedef struct
{
	XMMATRIX transfrom; // 정점 변환용 변수
} constant_buffer_t;

// D3D11에서 사용할 변수들
// Device: 리소스 생성
// DeviceContext: 렌더링에 사용할 정보를 담을 데이터 덩어리
// SwapChain: 버퍼를 디바이스에 렌더링하고 출력
// RenderTargetView: 리소스 뷰 중에서 렌더링 대상 용도
static ID3D11Device* spDevice;
static ID3D11DeviceContext* spDeviceContext;
static IDXGISwapChain* spSwapChain;
static ID3D11RenderTargetView* spRenderTargetView;

// VertexShader: 정점 쉐이더 리소스 인터페이스
// PixelShader: 픽셀 쉐이더 리소스 인터페이스
// VertexBuffer: 정점 버퍼 리소스 인터페이스
// IndexBuffer: 인덱스 버퍼 리소스 인터페이스
static ID3D11VertexShader* spVertexShader;
static ID3D11PixelShader* spPixelShader;
static ID3D11Buffer* spVertexBuffer;
static ID3D11Buffer* spIndexBuffer;

// ConstantBuffer: 쉐이더의 전역변수용 리소스 인터페이스
static constant_buffer_t sConstantBuffer;
static ID3D11Buffer* spConstantBuffer;

void InitializeD3D11()
{
	// 디바이스 생성 관련 정보
	UINT creationFlags = D3D11_CREATE_DEVICE_BGRA_SUPPORT;
#if DEBUG || _DEBUG
	creationFlags |= D3D11_CREATE_DEVICE_DEBUG;
#endif /* Debug */

	// 스왑체인에 대한 정보 초기화
	DXGI_SWAP_CHAIN_DESC swapChainDesc;
	ZeroMemory(&swapChainDesc, sizeof(swapChainDesc));

	// 현재 윈도우의 크기 구하기(작업 영역)
	RECT windowRect;
	GetClientRect(ghWnd, &windowRect);
	assert(GetLastError() == ERROR_SUCCESS);

	swapChainDesc.BufferCount = 1;
	swapChainDesc.BufferDesc.Width = windowRect.right;
	swapChainDesc.BufferDesc.Height = windowRect.bottom;
	swapChainDesc.BufferDesc.Format = DXGI_FORMAT_B8G8R8A8_UNORM; // 사용할 색상 포맷
	swapChainDesc.BufferDesc.RefreshRate.Numerator = 60; // 다시 그리는 주기의 분자
	swapChainDesc.BufferDesc.RefreshRate.Denominator = 1; // 다시 그리는 주기의 분모
	swapChainDesc.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT; // 버퍼의 용도
	swapChainDesc.OutputWindow = ghWnd; // 렌더링한 결과물을 출력할 윈도우
	swapChainDesc.SampleDesc.Count = 1; // 픽셀당 샘플링하는 수
	swapChainDesc.SampleDesc.Quality = 0; // 이미지의 품질 수준
	swapChainDesc.Windowed = true; // 창모드 설정

	// 디바이스, 디바이스 컨텍스트, 스왑체인 생성
	// 최신 문서는 다른 방식으로 생성 권장 중
	HRESULT hr = D3D11CreateDeviceAndSwapChain(
		nullptr, // 어댑터 포인터
		D3D_DRIVER_TYPE_HARDWARE, // 사용할 드라이버
		nullptr, // 레스터라이저의 주소
		creationFlags, // 생성 플래그
		nullptr, // 지원할 버전 정보 배열
		0, // 버전 정보 배열의 길이
		D3D11_SDK_VERSION, // D3D SDK 버전
		&swapChainDesc, // 스왑체인 정보 구조체, 
		&spSwapChain, // 생성된 스왑체인의 포인터를 받을 주소
		&spDevice, // 생성된 디바이스의 포인터를 받을 주소
		nullptr, // 생성된 버전 정보를 받을 주소
		&spDeviceContext // 생성된 디바이스 컨텍스트의 포인터를 받을 주소
	);
	assert(SUCCEEDED(hr));

	// 렌더 타겟으로 사용할 버퍼 갖고 오기
	ID3D11Texture2D* pBackBuffer = nullptr;
	hr = spSwapChain->GetBuffer(
		0, // 사용할 버퍼 번호
		__uuidof(ID3D11Texture2D), // 버퍼를 해석할 때 사용할 인터페이스
		(void**)&pBackBuffer // 버퍼 포인터를 받을 주소
	);
	assert(SUCCEEDED(hr));

	// 렌더 타겟 뷰 생성
	hr = spDevice->CreateRenderTargetView(
		pBackBuffer, // 사용할 리소스 포인터
		nullptr, // 렌더 타겟 뷰 정보 구조체 포인터
		&spRenderTargetView // 만들어진 렌터 타겟 뷰의 포인터를 받을 주소
	);
	assert(SUCCEEDED(hr));
	pBackBuffer->Release();
	pBackBuffer = nullptr;

	// 렌더 타겟을 파이프라인 OM 단계에 설정
	spDeviceContext->OMSetRenderTargets(
		1, // 넣을 뷰의 수
		&spRenderTargetView, // 렌터 타겟 포인터 배열
		nullptr // 깊이 스텐실 뷰 포인터
	);

	// 뷰포트 정보 초기화
	D3D11_VIEWPORT viewPort;
	viewPort.Width = (FLOAT)windowRect.right;
	viewPort.Height = (FLOAT)windowRect.bottom;
	viewPort.MinDepth = 0.f;
	viewPort.MaxDepth = 1.f;
	viewPort.TopLeftX = 0;
	viewPort.TopLeftY = 0;

	// 뷰 포트 설정
	spDeviceContext->RSSetViewports(
		1, // 뷰포트의 수
		&viewPort // 정보 구조체 포인터
	);

	// 쉐이더, 컴파일 오류를 받을 이진 개체
	ID3DBlob* pVertexShaderBlob = nullptr;
	ID3DBlob* pPixelShaderBlob = nullptr;
	ID3DBlob* pErrorBlob = nullptr;

	// 정점 쉐이더 컴파일
	hr = D3DCompileFromFile(
		TEXT("VertexShader.hlsl"), // 쉐이더 코드 파일 이름
		nullptr, // 쉐이더 매크로를 정의하는 구조체 포인터
		D3D_COMPILE_STANDARD_FILE_INCLUDE, // 쉐이더 컴파일러가 include 파일 처리에 사용하는 인터페이스 포인터
		"main", // 진입점 이름
		"vs_5_0", // 컴파일 대상
		0, // 컴파일 옵션
		0, // 컴파일 옵션2
		&pVertexShaderBlob, // 컴파일된 쉐이더 데이터 포인터를 받을 주소
		&pErrorBlob // 컴파일 에러 데이터 포인터를 받을 주소
	);
	assert(SUCCEEDED(hr));

	// 정점 쉐이더 리소스 생성
	hr = spDevice->CreateVertexShader(
		pVertexShaderBlob->GetBufferPointer(), // 컴파일된 쉐이더 데이터 포인터
		pVertexShaderBlob->GetBufferSize(), // 쉐이더 데이터의 길이
		nullptr, // 쉐이더 동적링크 관련 인터페이스 포인터
		&spVertexShader // 정점 쉐이더 인터페이스를 받을 주소
	);
	assert(SUCCEEDED(hr));

	// 픽셀 쉐이더 컴파일
	hr = D3DCompileFromFile(
		TEXT("PixelShader.hlsl"), // 쉐이더 코드 파일 이름
		nullptr, // 쉐이더 매크로를 정의하는 구조체 포인터
		D3D_COMPILE_STANDARD_FILE_INCLUDE, // 쉐이더 컴파일러가 include 파일 처리에 사용하는 인터페이스 포인터
		"main", // 진입점 이름
		"ps_5_0", // 컴파일 대상
		0, // 컴파일 옵션
		0, // 컴파일 옵션2
		&pPixelShaderBlob, // 컴파일된 쉐이더 데이터 포인터를 받을 주소
		&pErrorBlob // 컴파일 에러 데이터 포인터를 받을 주소
	);
	assert(SUCCEEDED(hr));

	// 픽셀 쉐이더 리소스 생성
	hr = spDevice->CreatePixelShader(
		pPixelShaderBlob->GetBufferPointer(), // 컴파일된 쉐이더 데이터 포인터
		pPixelShaderBlob->GetBufferSize(), // 쉐이더 데이터의 길이
		nullptr, // 쉐이더 동적링크 관련 인터페이스 포인터
		&spPixelShader // 정점 쉐이더 인터페이스를 받을 주소
	);
	assert(SUCCEEDED(hr));

	// GPU에게 정점의 정보를 알려주기 위한 구조체 초기화
	// 구조체에 포함된 각 요소별로 이 작업을 진행해서 넘겨줘야함
	D3D11_INPUT_ELEMENT_DESC vertexLayoutDesc;

	vertexLayoutDesc.SemanticName = "POSITION"; // 해당 데이터의 용도
	vertexLayoutDesc.SemanticIndex = 0; // 용도가 겹칠 경우 사용할 색인 번호
	vertexLayoutDesc.Format = DXGI_FORMAT_R32G32B32_FLOAT; // 입력 데이터 형식
	vertexLayoutDesc.InputSlot = 0; // 버퍼의 슬롯 번호
	vertexLayoutDesc.AlignedByteOffset = 0; // 구조체에서 요소의 시작 위치(바이트 단위)
	vertexLayoutDesc.InputSlotClass = D3D11_INPUT_PER_VERTEX_DATA; // 입력 데이터의 분류법
	vertexLayoutDesc.InstanceDataStepRate = 0; // 인스턴싱에 사용할 배수

	// 파이프라인에 전송할 레이아웃 배열
	D3D11_INPUT_ELEMENT_DESC layoutArr[] = {
		vertexLayoutDesc
	};

	// 파이프라인에서 사용할 레이아웃 생성
	ID3D11InputLayout* pVertexLayout = nullptr;
	hr = spDevice->CreateInputLayout(
		layoutArr, // 레이아웃 배열
		ARRAYSIZE(layoutArr), // 배열의 길이
		pVertexShaderBlob->GetBufferPointer(), // 컴파일된 쉐이더 데이터 포인터
		pVertexShaderBlob->GetBufferSize(), // 쉐이더 데이터의 길이
		&pVertexLayout // 생성된 레이아웃 포인터를 받을 주소
	);
	assert(SUCCEEDED(hr));

	// 정점 레이아웃 설정
	spDeviceContext->IASetInputLayout(pVertexLayout);

	pVertexShaderBlob->Release();
	pVertexShaderBlob = nullptr;

	pPixelShaderBlob->Release();
	pPixelShaderBlob = nullptr;

	pVertexLayout->Release();
	pVertexLayout = nullptr;

	// 전송할 정점 배열
	vertex_t vertices[3] = {
		DirectX::XMFLOAT3(0.f, 0.5f, 0.f),
		DirectX::XMFLOAT3(0.5f, -0.5f, 0.f),
		DirectX::XMFLOAT3(-0.5f, -0.5f, 0.f)
	};

	// 정점 버퍼에 대한 정보 구조체 초기화
	D3D11_BUFFER_DESC bufferDesc;

	bufferDesc.ByteWidth = sizeof(vertices); // 버퍼의 바이트 크기
	bufferDesc.Usage = D3D11_USAGE_DEFAULT; // 버퍼의 용도
	bufferDesc.BindFlags = D3D11_BIND_VERTEX_BUFFER; // 파이프라인에 뭘로 바인딩 할지
	bufferDesc.CPUAccessFlags = 0; // CPU의 접근 권한
	bufferDesc.MiscFlags = 0; // 리소스에 대한 옵션
	bufferDesc.StructureByteStride = sizeof(vertex_t); // 각 요소별 바이트 크기

	// 초기화할 정점 버퍼 서브리소스 구조체
	D3D11_SUBRESOURCE_DATA vertexSubresource;

	vertexSubresource.pSysMem = vertices; // 전송할 데이터 포인터
	vertexSubresource.SysMemPitch = 0; // 다음 행으로 가기 위한 시스템 바이트 수
	vertexSubresource.SysMemSlicePitch = 0; // 다음 면으로 가기 위한 시스템 바이트 수

	// 정점 버퍼 생성
	hr = spDevice->CreateBuffer(
		&bufferDesc, // 버퍼 정보 구조체 포인터
		&vertexSubresource, // 정점 서브 리소스 포인터
		&spVertexBuffer // 만들어진 버퍼 리소스 포인터를 받을 주소
	);
	assert(SUCCEEDED(hr));

	// 파이프라인에 정점 버퍼 설정
	UINT stride = sizeof(vertex_t);
	UINT offset = 0;

	spDeviceContext->IASetVertexBuffers(
		0, // 슬롯 번호
		1, // 버퍼의 수
		&spVertexBuffer, // 정점 버퍼 주소
		&stride, // 요소별 크기 배열
		&offset // 각 버퍼별 시작 오프셋 배열
	);

	// 삼각형 그리는 방법 설정
	spDeviceContext->IASetPrimitiveTopology(D3D11_PRIMITIVE_TOPOLOGY_TRIANGLELIST);

	// 인덱스 데이터 정의
	WORD indice[3] = {
		0, 1, 2
	};

	// 인덱스 버퍼에 대한 정보 구조체 초기화
	D3D11_BUFFER_DESC indexBufferDesc;

	indexBufferDesc.ByteWidth = sizeof(indice); // 버퍼의 바이트 크기
	indexBufferDesc.Usage = D3D11_USAGE_DEFAULT; // 버퍼의 용도
	indexBufferDesc.BindFlags = D3D11_BIND_INDEX_BUFFER; // 파이프라인에 뭘로 바인딩 할지
	indexBufferDesc.CPUAccessFlags = 0; // CPU의 접근 권한
	indexBufferDesc.MiscFlags = 0; // 리소스에 대한 옵션
	indexBufferDesc.StructureByteStride = sizeof(WORD); // 각 요소별 바이트 크기

	// 초기화할 인덱스 버퍼 서브리소스 구조체
	D3D11_SUBRESOURCE_DATA indexSubresource;

	indexSubresource.pSysMem = indice; // 전송할 데이터 포인터
	indexSubresource.SysMemPitch = 0; // 다음 행으로 가기 위한 시스템 바이트 수
	indexSubresource.SysMemSlicePitch = 0; // 다음 면으로 가기 위한 시스템 바이트 수

	// 인덱스 버퍼 생성
	hr = spDevice->CreateBuffer(
		&indexBufferDesc, // 버퍼 정보 구조체 포인터
		&indexSubresource, // 인덱스 서브 리소스 포인터
		&spIndexBuffer // 만들어진 버퍼 리소스 포인터를 받을 주소
	);
	assert(SUCCEEDED(hr));

	// 파이프라인에 인덱스 버퍼 설정
	spDeviceContext->IASetIndexBuffer(
		spIndexBuffer, // 설정할 인덱스 버퍼 포인터
		DXGI_FORMAT_R16_UINT, // 인덱스 버퍼의 형식
		0 // 시작 오프셋
	);

	// 회전에 사용할 변수 초기화
	sConstantBuffer.transfrom = XMMatrixIdentity();

	// 상수 버퍼에 대한 정보 구조체 초기화
	D3D11_BUFFER_DESC constantBufferDesc;

	constantBufferDesc.ByteWidth = sizeof(sConstantBuffer); // 버퍼의 바이트 크기
	constantBufferDesc.Usage = D3D11_USAGE_DEFAULT; // 버퍼의 용도
	constantBufferDesc.BindFlags = D3D11_BIND_CONSTANT_BUFFER; // 파이프라인에 뭘로 바인딩 할지
	constantBufferDesc.CPUAccessFlags = 0; // CPU의 접근 권한
	constantBufferDesc.MiscFlags = 0; // 리소스에 대한 옵션
	constantBufferDesc.StructureByteStride = sizeof(sConstantBuffer.transfrom); // 각 요소별 바이트 크기

	// 초기화할 상수 버퍼 서브리소스 구조체
	D3D11_SUBRESOURCE_DATA constantBufferSubresource;

	constantBufferSubresource.pSysMem = &sConstantBuffer; // 전송할 데이터 포인터
	constantBufferSubresource.SysMemPitch = 0; // 다음 행으로 가기 위한 시스템 바이트 수
	constantBufferSubresource.SysMemSlicePitch = 0; // 다음 면으로 가기 위한 시스템 바이트 수

	// 인덱스 버퍼 생성
	hr = spDevice->CreateBuffer(
		&constantBufferDesc, // 버퍼 정보 구조체 포인터
		&constantBufferSubresource, // 상수 버퍼 서브 리소스 포인터
		&spConstantBuffer // 만들어진 버퍼 리소스 포인터를 받을 주소
	);

	// 상수 버퍼 설정
	spDeviceContext->VSSetConstantBuffers(
		0, // 시작 슬롯
		1, // 설정할 버퍼의 수
		&spConstantBuffer // 설정할 버퍼 리소스 배열
	);

	spDeviceContext->PSSetConstantBuffers(
		0, // 시작 슬롯
		1, // 설정할 버퍼의 수
		&spConstantBuffer // 설정할 버퍼 리소스 배열
	);
}

void DestroyD3D11()
{
	if (spConstantBuffer != nullptr)
	{
		spConstantBuffer->Release();
		spConstantBuffer = nullptr;
	}

	if (spIndexBuffer != nullptr)
	{
		spIndexBuffer->Release();
		spIndexBuffer = nullptr;
	}

	if (spVertexBuffer != nullptr)
	{
		spVertexBuffer->Release();
		spVertexBuffer = nullptr;
	}

	if (spPixelShader != nullptr)
	{
		spPixelShader->Release();
		spPixelShader = nullptr;
	}

	if (spVertexShader != nullptr)
	{
		spVertexShader->Release();
		spVertexShader = nullptr;
	}

	if (spRenderTargetView != nullptr)
	{
		spRenderTargetView->Release();
		spRenderTargetView = nullptr;
	}

	if (spSwapChain != nullptr)
	{
		spSwapChain->Release();
		spSwapChain = nullptr;
	}

	if (spDeviceContext != nullptr)
	{
		spDeviceContext->ClearState();
		spDeviceContext->Release();
		spDeviceContext = nullptr;
	}

	if (spDevice != nullptr)
	{
		spDevice->Release();
		spDevice = nullptr;
	}
}

void Render()
{
	const FLOAT clearColor[4] = { 209 / 255.f, 95 / 255.f, 238 / 255.f, 1.f };

	assert(spRenderTargetView != nullptr);
	spDeviceContext->ClearRenderTargetView(
		spRenderTargetView, // 대상 렌더 타겟 뷰
		clearColor // 채워 넣을 색상
	);

	// 쉐이더 설정
	spDeviceContext->VSSetShader(
		spVertexShader, // 설정할 쉐이더 인터페이스 포인터
		nullptr, // HLSL 클래스를 캡슐화하는 인터페이스 포인터 배열
		0 // 배열의 길이
	);

	spDeviceContext->PSSetShader(
		spPixelShader, // 설정할 쉐이더 인터페이스 포인터
		nullptr, // HLSL 클래스를 캡슐화하는 인터페이스 포인터 배열
		0 // 배열의 길이
	);

	// 다음 변환 가중치 계산
	sConstantBuffer.transfrom *= XMMatrixRotationZ(XM_PI / 36);

	// HLSL 계산 방식으로 인한 전치
	XMMATRIX trTransform = XMMatrixTranspose(sConstantBuffer.transfrom);

	// 바인딩한 리소스 업데이트
	spDeviceContext->UpdateSubresource(
		spConstantBuffer, // 업데이트할 서브리소스 포인터
		0, // 업데이트할 서브리소스 번호
		nullptr, // 서브리소스 선택 박스 포인터
		&trTransform, // 업데이트에 사용할 데이터
		0, // 다음 행까지의 시스템 메모리 바이트 수
		0 // 다음 깊이까지의 시스템 메모리 바이트 수
	);

	spDeviceContext->DrawIndexed(
		3, // 그릴 인덱스의 수
		0, // 첫 인덱스를 읽을 위치
		0 // 정점 버퍼로부터 정점을 읽기 전에 각 인덱스에 더할 값
	);

	spSwapChain->Present(
		1, // 동기화에 사용할 시간
		0 // 프레임 표현 옵션
	);
}
~~~

### HLSL

#### VertexShader.hlsl

~~~ HLSL
#include "ShaderHeader.hlsli"

float4 main(float4 pos : POSITION) : SV_POSITION
{   
    return mul(pos, transform);
}
~~~

#### PixelShader.hlsl

~~~ HLSL
#include "ShaderHeader.hlsli"

float4 main(float4 pos : SV_Position) : SV_TARGET
{
    return mul(float4(pos.x, pos.y, pos.z, 1.f), transform);
}
~~~

#### ShaderHeader.hlsli

~~~ HLSL
cbuffer ConstantBuffer : register(b0)
{
    float4x4 transform;
}
~~~

## 코드 살펴보기

### 사용할 라이브러리 및 컴파일러 옵션

이전과 동일

### 윈도우 관련 코드

이전과 동일

### DirectX11

&emsp;이번 흐름은 다음과 같습니다.

1. 상수 버퍼(Constant Buffer)용 구조체 선언
2. 튜토리얼1, 2와 동일한 방식
3. 상수 버퍼용 개체 포인터 선언
4. 상수 버퍼 데이터 정의
5. 상수 버퍼 리소스 생성 및 상수 버퍼를 사용할 쉐이더에 설정
6. 상수 버퍼 업데이트 및 렌더링

#### 상수 버퍼(Constant Buffer)용 구조체 선언

~~~ C++
typedef struct
{
	XMMATRIX transfrom; // 정점 변환용 변수
} constant_buffer_t;
~~~

&emsp;이번 게시글에서는 요것만 사용할 예정입니다. 결과에서 계속 색깔 바뀌면서 회전 했던 것 치곤 별 거 없죠?ㅋㅋ 하지만 실제로는

~~~ C++
typedef struct
{
    // 행렬1 선언
    // 행렬2 선언
    // 행렬3 선언
    // 공통 상수 선언
    // ...
} constant_buffer_t;
~~~

&emsp;요런 식으로 꽤나 많은 정보를 넣어서 사용하긴 합니다. 추가적인 정보가 있는데 그건 차후에 말씀드립죠!

##### 상수 버퍼(Constant Buffer)

&emsp;일단 주 참고자료 설명으로는 어플리케이션이 쉐이더에게 넘길 데이터를 저장하는 장소 정도로 설명이 돼있네요. D3D11 버퍼 문서에서는 쉐이더 상수 데이터를 파이프라인에 효율적으로 공급하는 걸 도와주는 버퍼 정도로 나와있습니다. 그냥 한마디로 쉐이더에서 쓸 전역변수를 저장하는 곳이다 정도로 생각하면 좋을 것 같습니다.

#### 상수 버퍼용 개체 포인터 선언

~~~ C++
// ConstantBuffer: 쉐이더의 전역변수용 리소스 인터페이스
static constant_buffer_t sConstantBuffer;
static ID3D11Buffer* spConstantBuffer;
~~~

&emsp;사용할 상수 버퍼 및 상수 버퍼 리소스를 선언해줍시다. 제가 아직 방법을 모르는 걸 수도 있는데 상수 버퍼는 내용 변경이 필요한 경우 CPU에서 업데이트한 내용을 전송해서 사용하는터라 CPU에서 쓸 자리도 같이 잡는 게 보통이더군요. 여튼 그래서 `sConstantBuffer`도 같이 선언됩니다.

#### 상수 버퍼 데이터 정의

~~~ C++
// 회전에 사용할 변수 초기화
sConstantBuffer.transfrom = XMMatrixIdentity();

// 상수 버퍼에 대한 정보 구조체 초기화
D3D11_BUFFER_DESC constantBufferDesc;

constantBufferDesc.ByteWidth = sizeof(sConstantBuffer); // 버퍼의 바이트 크기
constantBufferDesc.Usage = D3D11_USAGE_DEFAULT; // 버퍼의 용도
constantBufferDesc.BindFlags = D3D11_BIND_CONSTANT_BUFFER; // 파이프라인에 뭘로 바인딩 할지
constantBufferDesc.CPUAccessFlags = 0; // CPU의 접근 권한
constantBufferDesc.MiscFlags = 0; // 리소스에 대한 옵션
constantBufferDesc.StructureByteStride = sizeof(sConstantBuffer.transfrom); // 각 요소별 바이트 크기

// 초기화할 상수 버퍼 서브리소스 구조체
D3D11_SUBRESOURCE_DATA constantBufferSubresource;

constantBufferSubresource.pSysMem = &sConstantBuffer; // 전송할 데이터 포인터
constantBufferSubresource.SysMemPitch = 0; // 다음 행으로 가기 위한 시스템 바이트 수
constantBufferSubresource.SysMemSlicePitch = 0; // 다음 면으로 가기 위한 시스템 바이트 수
~~~

&emsp;다른 버퍼랑 또오옥같습니다. 플래그만 잘 설정해주면 사실상 끝 <br>
&emsp;제가 다른 버퍼 코드 복붙에서 값 넣어놔서 그렇긴 한데 코드는 더 덜어내서 써도 되긴 합니다.

#### 상수 버퍼 리소스 생성 및 상수 버퍼를 사용할 쉐이더에 설정

~~~ C++
	// 인덱스 버퍼 생성
	hr = spDevice->CreateBuffer(
		&constantBufferDesc, // 버퍼 정보 구조체 포인터
		&constantBufferSubresource, // 상수 버퍼 서브 리소스 포인터
		&spConstantBuffer // 만들어진 버퍼 리소스 포인터를 받을 주소
	);

	// 상수 버퍼 설정
	spDeviceContext->VSSetConstantBuffers(
		0, // 시작 슬롯
		1, // 설정할 버퍼의 수
		&spConstantBuffer // 설정할 버퍼 리소스 배열
	);

	spDeviceContext->PSSetConstantBuffers(
		0, // 시작 슬롯
		1, // 설정할 버퍼의 수
		&spConstantBuffer // 설정할 버퍼 리소스 배열
	);
~~~

&emsp;여기도 뻔하죠?

#### 역시나

~~~ C++
void DestroyD3D11()
{
	if (spConstantBuffer != nullptr)
	{
		spConstantBuffer->Release();
		spConstantBuffer = nullptr;
	}

    // 생략
}
~~~

&emsp;해제 잘 해줍시다!

#### 상수 버퍼 업데이트 및 렌더링

~~~ C++
void Render()
{
	// 생략

	// 다음 변환 가중치 계산
	sConstantBuffer.transfrom *= XMMatrixRotationZ(XM_PI / 36);

	// HLSL 계산 방식으로 인한 전치
	XMMATRIX trTransform = XMMatrixTranspose(sConstantBuffer.transfrom);

	// 바인딩한 리소스 업데이트
	spDeviceContext->UpdateSubresource(
		spConstantBuffer, // 업데이트할 서브리소스 포인터
		0, // 업데이트할 서브리소스 번호
		nullptr, // 서브리소스 선택 박스 포인터
		&trTransform, // 업데이트에 사용할 데이터
		0, // 다음 행까지의 시스템 메모리 바이트 수
		0 // 다음 깊이까지의 시스템 메모리 바이트 수
	);

    // 생략
}
~~~

&emsp;상수 버퍼 내용을 다음 변환으로 업데이트하고 전송하는 부분만 적어놨습니다. 개인적으론 CPU에서 계산해서 넘겨주는 방식이 조금 독특하다 느껴지더군요ㅋㅋ

##### 주의할 점

&emsp;행렬, 벡터 사용할 때 주의할 점이 있습니다. 기본적으로 DirectX랑, HLSL의 '사용법' 자체는 벡터 * 행렬(Row-major 방식)로 구성되어 있고 DirectXMath 라이브러리도 동일한 방법으로 구현돼있습니다. 그러나 HLSL은 기본 방식은 행렬 * 벡터(Column-major 방식) 형태로 되어 있기 때문에 전송하기 전에 전치 연산을 하고 전송해주셔야 합니다.(따로 설정하는 방법도 있긴 합니다. 자세한 건 문서 참고!)

$$
	\begin{bmatrix}
 		1 & 2 & 3 & 4
	\end{bmatrix}
	\begin{bmatrix}
 		1 & 2 & 3 & 4 \\\\\\
		1 & 2 & 3 & 4 \\\\\\
		1 & 2 & 3 & 4 \\\\\\
		1 & 2 & 3 & 4
	\end{bmatrix}
$$

&emsp;Row-major는 요렇게 표현 하는 방법이고

$$
	\begin{bmatrix}
 		1 & 1 & 1 & 1 \\\\\\
		2 & 2 & 2 & 2 \\\\\\
		3 & 3 & 3 & 3 \\\\\\
		4 & 4 & 4 & 4
	\end{bmatrix}
	\begin{bmatrix}
 		1 \\\\\\
		2 \\\\\\
		3 \\\\\\
		4 \\\\\\
	\end{bmatrix}
$$

&emsp;Column-major는 요렇게 표현합니다.

##### 사소한 팁?

&emsp;앞서 나중에 보자던 정보와 관련된 내용입니다. 앞서 말씀드렸던 것 처럼 상수 버퍼는 

~~~ C++
typedef struct
{
    // 행렬1 선언
    // 행렬2 선언
    // 행렬3 선언
    // 공통 상수 선언
    // ...
} constant_buffer_t;
~~~

요렇게 만든 정보를 담고 전달될 수 있다고 했었습니다. 그런데 만약 저 상수 버퍼 중에서 변하는 정보는 몇 개 없는 상태라면 저 덩치 큰 상수 버퍼를 계속 다시 전송해주는 게 효율적이지 않겠죠? 마치 정점 버퍼에서 데이터를 직접 전송하는 것보다는 인덱스 버퍼를 만들어서 전송하는 게 더 낫다는 느낌과 비슷하다고도 볼 수 있습니다. 그렇기 때문에 효율적인 전송이 필요한 경우 

~~~ C++
typedef struct
{
	// 자주 바뀌는 행렬1
} constant_buffer1_t;

typedef struct
{
	// 자주 바뀌는 행렬2
} constant_buffer2_t;

typedef struct
{
	// 자주 바뀌는 행렬3
} constant_buffer3_t;

typedef struct
{
	// 공통 상수 선언
	// ...
} constant_buffer_t;
~~~

이런 식으로 쪼개서 데이터를 만들어 두고 각각에 대해서 상수 버퍼를 만들어서 쉐이더에 설정합니다. 그러고 나서 쉐이더 코드에서

~~~ HLSL
cbuffer cbMatrix1
{
	// 행렬1
}

cbuffer cbMatrix2
{
	// 행렬2
}

cbuffer cbMatrix3
{
	// 행렬3
}
~~~

이런 식으로 각자 잡아 놓고 사용하기도 합니다. 당연히 각자 잡아놓은 만큼 `UpdateResource()`도 따로 해줘야 하는 귀찮음은 있긴 합니다. 그러나 효율적으로 전송을 하고 싶다면 고려해야될 방법이기도 합니다.

### HLSL

&emsp;제가 HLSL에 관해선 별다른 내용을 넣고 있지 않은데 이유가

1. C-like 언어라 현재 C++를 사용하고 있는 상황에서 문법적으론 크게 문제가 되지 않는다.
2. 쉐이더로 아주아주 복잡한 프로그램을 짜는 건 아니라서 검색하면서 해결하기에 무리가 없을 것 같다.

라고 생각하기 때문입니다. 물론 제가 전문가는 아니라 틀린 생각일 수도 있음은 참고 부탁드려요ㅋㅋ

#### Semantics

&emsp;그래도 이 용어 정도는 짚고 가면 좋을 것 같아서 언급하고 갑니다. 주로 자료형 같은 거 옆에 ':'(콜론)을 붙여서 다는 키워드들 말하는데 문서에서는 파라미터의 의도된 용도에 대해서 정보를 전달하려고 쉐이더 입력 또는 출력에 첨부되는 문자열 정도로 설명하고 있네요.

#### VertexShader.hlsl

~~~ HLSL
cbuffer ConstantBuffer : register(b0)
{
    float4x4 transform;
}

float4 main(float4 pos : POSITION) : SV_POSITION
{   
    return mul(pos, transform);
}
~~~

#### PixelShader.hlsl

~~~ HLSL
cbuffer ConstantBuffer : register(b0)
{
    float4x4 transform;
}

float4 main(float4 pos : SV_Position) : SV_TARGET
{
    return mul(float4(pos.x, pos.y, pos.z, 1.f), transform);
}
~~~

&emsp;쉐이더 코드 간단하죠? 이런 간단한 코드로도 뭔가 하는 것처럼 보이는 결과를 만들 수 있습니다ㅋㅋ

&emsp;그런데 hlsl 파일이 별도인데 ConstantBuffer 코드가 복붙으로 중복돼서 불-편한 상황이 아닐 수가 없습니다. 그런데 다행히도 HLSL은 include를 지원합니다!

### HLSL의 include를 활용한 DirectX 및 HLSL

&emsp;안타깝게도 바로 include한다고 사용할 수는 없습니다 흑흑...

#### VertexShader.hlsl

~~~ HLSL
#include "ShaderHeader.hlsli"

float4 main(float4 pos : POSITION) : SV_POSITION
{   
    return mul(pos, transform);
}
~~~

#### PixelShader.hlsl

~~~ HLSL
#include "ShaderHeader.hlsli"

float4 main(float4 pos : SV_Position) : SV_TARGET
{
    return mul(float4(pos.x, pos.y, pos.z, 1.f), transform);
}
~~~

#### ShaderHeader.hlsli

~~~ HLSL
cbuffer ConstantBuffer : register(b0)
{
    float4x4 transform;
}
~~~

&emsp;C랑 비슷하니 어려울 건 없죠? 일단 쉐이더 코드가 간단하니 요것부터 보고

#### InitializeD3D11

~~~ C++
// 생략

// 정점 쉐이더 컴파일
hr = D3DCompileFromFile(
	TEXT("VertexShader.hlsl"), // 쉐이더 코드 파일 이름
	nullptr, // 쉐이더 매크로를 정의하는 구조체 포인터
	D3D_COMPILE_STANDARD_FILE_INCLUDE, // 쉐이더 컴파일러가 include 파일 처리에 사용하는 인터페이스 포인터
	"main", // 진입점 이름
	"vs_5_0", // 컴파일 대상
	0, // 컴파일 옵션
	0, // 컴파일 옵션2
	&pVertexShaderBlob, // 컴파일된 쉐이더 데이터 포인터를 받을 주소
	&pErrorBlob // 컴파일 에러 데이터 포인터를 받을 주소
);
assert(SUCCEEDED(hr));

// 생략

// 픽셀 쉐이더 컴파일
hr = D3DCompileFromFile(
	TEXT("PixelShader.hlsl"), // 쉐이더 코드 파일 이름
	nullptr, // 쉐이더 매크로를 정의하는 구조체 포인터
	D3D_COMPILE_STANDARD_FILE_INCLUDE, // 쉐이더 컴파일러가 include 파일 처리에 사용하는 인터페이스 포인터
	"main", // 진입점 이름
	"ps_5_0", // 컴파일 대상
	0, // 컴파일 옵션
	0, // 컴파일 옵션2
	&pPixelShaderBlob, // 컴파일된 쉐이더 데이터 포인터를 받을 주소
	&pErrorBlob // 컴파일 에러 데이터 포인터를 받을 주소
);
assert(SUCCEEDED(hr));
~~~

&emsp;ID3DInclude 포인터 자리에 저렇게 옵션 넣어주면 사용가능합니다! 사실 별 거 없었습니다ㅋㅋㅋ 근데 포인터 자리에 저렇게 플래그 같아보이는 옵션을 넣는 게 어색한 느낌도 있을 거 같아서 뜸 들여봤습니다ㅎㅎ

## 소스코드 깃 주소

[SimpleShader](https://github.com/redbindy/DX11ForPost/tree/master/SimpleShader)

## 참고자료 및 출처
- [DirectX-SDK-Samples](https://github.com/walbourn/directx-sdk-samples)
- [MSDN - Introduction to Buffers in Direct3D 11](https://learn.microsoft.com/en-us/windows/win32/direct3d11/overviews-direct3d-11-resources-buffers-intro#constant-buffer)
- [MSDN - How to: Create a Constant Buffer](https://learn.microsoft.com/ko-kr/windows/win32/direct3d11/overviews-direct3d-11-resources-buffers-constant-how-to)
- [MSDN - Per-Component Math Operations](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-per-component-math)
- [MSDN - Semantics](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-semantics)
- [MSDN - D3DCompileFromFile function (d3dcompiler.h)](https://learn.microsoft.com/en-us/windows/win32/api/d3dcompiler/nf-d3dcompiler-d3dcompilefromfile)