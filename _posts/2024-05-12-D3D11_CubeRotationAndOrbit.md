---
layout: post
title: "Direct3D11 튜토리얼 정리5: 3차원 변환을 활용한 공전, 자전 육면체 그리기"
category: 컴퓨터공학
tags: [C/C++, D3D11, Direct3D11]
---

## 이전 게시글

&emsp;이전 게시글에서 내용과 코드가 이어집니다. 안 보고 오셨다면

### [Direct3D11 튜토리얼 정리1: 화면 지우기](/컴퓨터공학/2024/03/20/D3D11_ClearScreen.html)
### [Direct3D11 튜토리얼 정리2: 삼각형 그리기](/컴퓨터공학/2024/03/29/D3D11_DrawTriangle.html)
### [Direct3D11 튜토리얼 정리3: 간단한 쉐이더 활용](/컴퓨터공학/2024/04/03/D3D11_SimpleShader.html)
### [Direct3D11 튜토리얼 정리4: 육면체 그리기 및 3D 공간](/컴퓨터공학/2024/05/09/D3D11_DrawCubeAnd3DSpace.html)

&emsp;먼저 보시는 것도 추천!

## 결과

![결과 이미지](/assets/images/2024-05-12-D3D11_CubeRotationAndOrbit_images/result.gif)

&emsp;이렇게 육면체를 두 개 그려서 공전과 자전하도록 만들어보겠습니다. 할 일이 그리 많지 않아서 이번에도 가벼운 글이 될 것 같네요.

&emsp;정리 4번 글 형식이 단계적으로 보기 좋은 것 같아서 앞으로는 별 일 없으면 4번 형식을 섞어서 작성할 것 같습니다!

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
	XMFLOAT4 color; // Red, Green, Blue, Alpha를 표현하기 위한 float4
} vertex_t;

typedef struct
{
	XMMATRIX world;
	XMMATRIX view;
	XMMATRIX projection;

	XMMATRIX transfrom; // 정점 변환용 변수
} constant_buffer_t;

// D3D11에서 사용할 변수들
// Device: 리소스 생성
// DeviceContext: 렌더링에 사용할 정보를 담을 데이터 덩어리
// SwapChain: 버퍼를 디바이스에 렌더링하고 출력
// RenderTargetView: 리소스 뷰 중에서 렌더링 대상 용도
// Texture2D: 리소스 중 2D 버퍼 용도
// DepthStencilView: 리소스 뷰 중에서 깊이/스텐실 추적 용도
static ID3D11Device* spDevice;
static ID3D11DeviceContext* spDeviceContext;
static IDXGISwapChain* spSwapChain;
static ID3D11RenderTargetView* spRenderTargetView;
static ID3D11Texture2D* spDepthStencilBuffer;
static ID3D11DepthStencilView* spDepthStencilView;

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

	// 깊이/스텐실 버퍼 정보 초기화
	D3D11_TEXTURE2D_DESC depthBufferDesc;

	depthBufferDesc.Width = windowRect.right; // 텍스쳐 너비
	depthBufferDesc.Height = windowRect.bottom; // 텍스쳐 높이
	depthBufferDesc.MipLevels = 1; // mipmap 수준(level)의 최대 수
	depthBufferDesc.ArraySize = 1; // 텍스쳐 배열에서 텍스쳐의 수
	depthBufferDesc.Format = DXGI_FORMAT_D24_UNORM_S8_UINT; // 텍스쳐의 데이터 형식
	depthBufferDesc.SampleDesc.Count = 1; // 픽셀당 샘플링하는 수
	depthBufferDesc.SampleDesc.Quality = 0; // 이미지 품질 수준
	depthBufferDesc.Usage = D3D11_USAGE_DEFAULT; // 텍스쳐의 용도
	depthBufferDesc.BindFlags = D3D11_BIND_DEPTH_STENCIL; // 파이프라인에 뭘로 바인딩 할지
	depthBufferDesc.CPUAccessFlags = 0; // CPU의 접근 권한
	depthBufferDesc.MiscFlags = 0; // 리소스에 대한 옵션

	// 깊이/스텐실용 리소스 생성
	hr = spDevice->CreateTexture2D(
		&depthBufferDesc, // 텍스쳐 정보 구조체
		nullptr,  // 서브리소스 데이터
		&spDepthStencilBuffer // 생성된 텍스쳐의 포인터를 받을 주소
	);
	assert(SUCCEEDED(hr));

	// 깊이/스텐실 뷰 정보 초기화
	D3D11_DEPTH_STENCIL_VIEW_DESC depthStencilViewDesc;

	depthStencilViewDesc.Format = depthBufferDesc.Format; // 뷰의 데이터 형식
	depthStencilViewDesc.ViewDimension = D3D11_DSV_DIMENSION_TEXTURE2D; // 리소스의 자료형
	depthStencilViewDesc.Flags = 0; // 텍스쳐가 읽기 전용인지를 나타내는 플래그
	depthStencilViewDesc.Texture2D.MipSlice = 0; // 첫 번째로 사용할 mipmap 수준의 색인

	// 깊이/스텐실 뷰 생성
	hr = spDevice->CreateDepthStencilView(
		spDepthStencilBuffer, // 사용할 리소스 포인터
		&depthStencilViewDesc, // 깊이/스텐실 정보 구조체
		&spDepthStencilView // 깊이/스텐실 뷰 포인터를 받을 주소
	);
	assert(SUCCEEDED(hr));

	// 렌더 타겟을 파이프라인 OM 단계에 설정
	spDeviceContext->OMSetRenderTargets(
		1, // 넣을 뷰의 수
		&spRenderTargetView, // 렌터 타겟 포인터 배열
		spDepthStencilView // 깊이 스텐실 뷰 포인터
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
	D3D11_INPUT_ELEMENT_DESC vertexLayoutDescForPos;

	vertexLayoutDescForPos.SemanticName = "POSITION"; // 해당 데이터의 용도
	vertexLayoutDescForPos.SemanticIndex = 0; // 용도가 겹칠 경우 사용할 색인 번호
	vertexLayoutDescForPos.Format = DXGI_FORMAT_R32G32B32_FLOAT; // 입력 데이터 형식
	vertexLayoutDescForPos.InputSlot = 0; // 버퍼의 슬롯 번호
	vertexLayoutDescForPos.AlignedByteOffset = 0; // 구조체에서 요소의 시작 위치(바이트 단위)
	vertexLayoutDescForPos.InputSlotClass = D3D11_INPUT_PER_VERTEX_DATA; // 입력 데이터의 분류법
	vertexLayoutDescForPos.InstanceDataStepRate = 0; // 인스턴싱에 사용할 배수

	D3D11_INPUT_ELEMENT_DESC vertexLayoutDescForColor;

	vertexLayoutDescForColor.SemanticName = "COLOR"; // 해당 데이터의 용도
	vertexLayoutDescForColor.SemanticIndex = 0; // 용도가 겹칠 경우 사용할 색인 번호
	vertexLayoutDescForColor.Format = DXGI_FORMAT_R32G32B32A32_FLOAT; // 입력 데이터 형식
	vertexLayoutDescForColor.InputSlot = 0; // 버퍼의 슬롯 번호
	vertexLayoutDescForColor.AlignedByteOffset = sizeof(vertex_t::pos); // 구조체에서 요소의 시작 위치(바이트 단위)
	vertexLayoutDescForColor.InputSlotClass = D3D11_INPUT_PER_VERTEX_DATA; // 입력 데이터의 분류법
	vertexLayoutDescForColor.InstanceDataStepRate = 0; // 인스턴싱에 사용할 배수

	// 파이프라인에 전송할 레이아웃 배열
	D3D11_INPUT_ELEMENT_DESC layoutArr[] = {
		vertexLayoutDescForPos,
		vertexLayoutDescForColor
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
	vertex_t vertices[8] = {
		{ { 1.f, 1.f, -1.f }, { 0.f, 0.f, 0.f, 1.f} },
		{ { 1.f, -1.f, -1.f }, { 1.f, 0.f, 0.f, 1.f} },
		{ { -1.f, 1.f, -1.f }, { 0.f, 1.f, 0.f, 1.f} },
		{ { -1.f, -1.f, -1.f }, { 0.f, 0.f, 1.f, 1.f} },
		{ { 1.f, 1.f, 1.f }, { 1.f, 1.f, 0.f, 1.f} },
		{ { 1.f, -1.f, 1.f }, { 1.f, 0.f, 1.f, 1.f} },
		{ { -1.f, 1.f, 1.f }, { 0.f, 1.f, 1.f, 1.f} },
		{ { -1.f, -1.f, 1.f }, { 1.f, 1.f, 1.f, 1.f} }
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
	WORD indice[36] = {
		2, 0, 1, // 정면
		2, 1, 3,

		0, 4, 5, // 우측
		5, 1, 0,

		4, 6, 7, // 뒷면
		7, 5, 4,

		3, 7, 6, // 좌측
		6, 2, 3,

		2, 6, 4, // 윗면
		4, 0, 2,

		3, 1, 5, // 아랫면
		5, 7, 3
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

	// 월드 변환 행렬 초기화
	sConstantBuffer.world = XMMatrixIdentity();

	// 뷰 변환 행렬 초기화
	XMVECTOR eyePosition = XMVectorSet(0.f, 3.f, -5.f, 0.f);
	XMVECTOR focusPosition = XMVectorSet(0.f, 1.f, 0.f, 0.f);
	XMVECTOR upDirection = XMVectorSet(0.f, 1.f, 0.f, 0.f);

	sConstantBuffer.view = XMMatrixLookAtLH(
		eyePosition, // 눈(= 카메라)의 위치
		focusPosition, // 초점의 위치(= 시선의 위치)
		upDirection // 카메라의 위쪽 방향
	);

	sConstantBuffer.view = XMMatrixTranspose(sConstantBuffer.view);

	// 투영 변환 행렬 초기화
	sConstantBuffer.projection = XMMatrixPerspectiveFovLH(
		XM_PIDIV2, // 하양식 시야각(= y축과 평행한 시야각)
		windowRect.right / (float)windowRect.bottom, // 종횡비 비율 값 = 너비 / 높이
		0.01f, // 절두체 근평면의 위치
		100.f // 절두체 원평면의 위치
	);

	sConstantBuffer.projection = XMMatrixTranspose(sConstantBuffer.projection);

	// 상수 버퍼에 대한 정보 구조체 초기화
	D3D11_BUFFER_DESC constantBufferDesc;

	constantBufferDesc.ByteWidth = sizeof(sConstantBuffer); // 버퍼의 바이트 크기
	constantBufferDesc.Usage = D3D11_USAGE_DEFAULT; // 버퍼의 용도
	constantBufferDesc.BindFlags = D3D11_BIND_CONSTANT_BUFFER; // 파이프라인에 뭘로 바인딩 할지
	constantBufferDesc.CPUAccessFlags = 0; // CPU의 접근 권한
	constantBufferDesc.MiscFlags = 0; // 리소스에 대한 옵션
	constantBufferDesc.StructureByteStride = sizeof(XMMATRIX); // 각 요소별 바이트 크기

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
	if (spDepthStencilView != nullptr)
	{
		spDepthStencilView->Release();
		spDepthStencilView = nullptr;
	}

	if (spDepthStencilBuffer != nullptr)
	{
		spDepthStencilBuffer->Release();
		spDepthStencilBuffer = nullptr;
	}

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
	const FLOAT clearColor[4] = { 0.5f, 0.5f, 0.5f, 1.f };

	assert(spRenderTargetView != nullptr);
	spDeviceContext->ClearRenderTargetView(
		spRenderTargetView, // 대상 렌더 타겟 뷰
		clearColor // 채워 넣을 색상
	);

	spDeviceContext->ClearDepthStencilView(
		spDepthStencilView, // 대상 깊이/스텐실 뷰
		D3D11_CLEAR_DEPTH, // 지울 데이터 형식
		1.f, // 채워 넣을 깊이값
		UINT8_MAX // 채워 넣을 스텐실 값
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

	// 회전 행렬용 정적 각도 값
	const float DELTA_THETA = XM_PI / 36;
	static float theta = 0;

	theta += DELTA_THETA;
	// 다음 변환 가중치 계산
	constant_buffer_t constantBufferForCenterCube = sConstantBuffer;
	XMMATRIX rotationTransform = XMMatrixRotationY(theta);

	// HLSL 계산 방식으로 인한 전치
	constantBufferForCenterCube.transfrom = XMMatrixTranspose(rotationTransform);

	// 바인딩한 리소스 업데이트
	spDeviceContext->UpdateSubresource(
		spConstantBuffer, // 업데이트할 서브리소스 포인터
		0, // 업데이트할 서브리소스 번호
		nullptr, // 서브리소스 선택 박스 포인터
		&constantBufferForCenterCube, // 업데이트에 사용할 데이터
		0, // 다음 행까지의 시스템 메모리 바이트 수
		0 // 다음 깊이까지의 시스템 메모리 바이트 수
	);

	spDeviceContext->DrawIndexed(
		36, // 그릴 인덱스의 수
		0, // 첫 인덱스를 읽을 위치
		0 // 정점 버퍼로부터 정점을 읽기 전에 각 인덱스에 더할 값
	);

	constant_buffer_t constantBufferForOrbitCube = sConstantBuffer;

	XMMATRIX scaleTransform = XMMatrixScaling(
		0.5f, // x축 방향 확대/축소 값
		0.5f, // y축 방향 확대/축소 값
		0.5f // z축 방향 확대/축소 값
	);

	XMMATRIX rotationOrbitCube = XMMatrixRotationY(theta * 2.f);

	XMMATRIX translationTransform = XMMatrixTranslation(
		3.f, // x축 변위
		0.f, // y축 변위
		0.f // z축 변위
	);

	XMMATRIX orbitTransform = XMMatrixRotationY(-theta);

	constantBufferForOrbitCube.transfrom = XMMatrixTranspose(scaleTransform * rotationOrbitCube * translationTransform * orbitTransform);

	// 바인딩한 리소스 업데이트
	spDeviceContext->UpdateSubresource(
		spConstantBuffer, // 업데이트할 서브리소스 포인터
		0, // 업데이트할 서브리소스 번호
		nullptr, // 서브리소스 선택 박스 포인터
		&constantBufferForOrbitCube, // 업데이트에 사용할 데이터
		0, // 다음 행까지의 시스템 메모리 바이트 수
		0 // 다음 깊이까지의 시스템 메모리 바이트 수
	);

	spDeviceContext->DrawIndexed(
		36, // 그릴 인덱스의 수
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

struct VS_INPUT
{
    float4 pos : POSITION;
    float4 color : COLOR;
};

VS_OUTPUT main(VS_INPUT input)
{   
    float4x4 mat = mul(transform, world);
    mat = mul(mat, view);
    mat = mul(mat, projection);

    VS_OUTPUT output = input;
    output.pos = mul(output.pos, mat);
    
    return output;
}
~~~

#### PixelShader.hlsl

~~~ HLSL
#include "ShaderHeader.hlsli"

float4 main(PS_INPUT input) : SV_TARGET
{
    return input.color;
}
~~~

#### ShaderHeader.hlsli

~~~ HLSL
cbuffer ConstantBuffer : register(b0)
{
    float4x4 world;
    float4x4 view;
    float4x4 projection;
    
    float4x4 transform;
}

struct VS_OUTPUT
{
    float4 pos : SV_Position;
    float4 color : COLOR;
};

typedef VS_OUTPUT PS_INPUT;
~~~

## 변환 감잡기

&emsp;본격적으로 코드 들어가기 전에 변환에 대해서 감만 잡고 가봅시다. 그래야 왜 코드에서 그런 일을 하는지 와닿을 것 같네요.

&emsp;우선 변환의 개념은 4번에서 간단하게 나마 다뤘으니 넘어가도록 하겠습니다. 어쨌거나, 이번에 저희가 주목해야 하는 변환은 정점을 바꾼다는 관점에서 이동, 변환, 확대/축소(스케일링) 변환입니다. 일반적으로 정점에 대해서 수행한다고 하면 이 세 유형의 변환을 떠올리면 될 가능성이 높을 것 같습니다. <br>
&emsp;각 변환들은 모두 공간 원점을 기준으로 수행됩니다. 예를 들어서, 다음과 같은 두 도형이 있다고 했을 때, (보기 편하게 2차원 도형으로 하겠습니다!)

![변환 예시 삼각형](/assets/images/2024-05-12-D3D11_CubeRotationAndOrbit_images/TransformExample.jpg)

원점에 대해서 반시계 방향으로 45도 회전시킨다고 해봅시다. 그렇다면 결과는

![45도 반시계 방향 변환](/assets/images/2024-05-12-D3D11_CubeRotationAndOrbit_images/Rotation45Example.jpg)

위 그림에서 새로 그려진 삼각형처럼 변하게 됩니다. 회전한 모양 자체는 같지만 그림에서 표기한 것처럼 원점에 대해 원을 그리듯이 회전하게 되는 것이죠.

&emsp;설명이 제가봐도 살짝 아리송한데 직접 변환 순서 바꿔가면서 확인하시면 더 확실하게 이해되실 겁니다. 일단 당장은 어쨌든 변환 행렬은 항상 "원점"을 기준으로 정보를 바꾼다는 것과 이러한 변환의 순서만 잘 조정해주면 어떤 변환이든 구현이 가능하다는 것 정도만 염두해두고 실습해보면서 익혀봅시다.

## 코드 살펴보기

### 사용할 라이브러리 및 컴파일러 옵션

이전과 동일

### 윈도우 관련 코드

이전과 동일

### Direct3D11 단계별 접근

#### 렌더링 코드 변경

~~~ C++
// 다음 변환 가중치 계산
constant_buffer_t constantBufferForCenterCube = sConstantBuffer;
XMMATRIX rotationTransform = XMMatrixRotationY(theta);

// HLSL 계산 방식으로 인한 전치
constantBufferForCenterCube.transfrom = XMMatrixTranspose(rotationTransform);

// 바인딩한 리소스 업데이트
spDeviceContext->UpdateSubresource(
	spConstantBuffer, // 업데이트할 서브리소스 포인터
	0, // 업데이트할 서브리소스 번호
	nullptr, // 서브리소스 선택 박스 포인터
	&constantBufferForCenterCube, // 업데이트에 사용할 데이터
	0, // 다음 행까지의 시스템 메모리 바이트 수
	0 // 다음 깊이까지의 시스템 메모리 바이트 수
);

spDeviceContext->DrawIndexed(
	36, // 그릴 인덱스의 수
	0, // 첫 인덱스를 읽을 위치
	0 // 정점 버퍼로부터 정점을 읽기 전에 각 인덱스에 더할 값
);

constant_buffer_t constantBufferForOrbitCube = sConstantBuffer;

XMMATRIX scaleTransform = XMMatrixScaling(
	0.5f, // x축 방향 확대/축소 값
	0.5f, // y축 방향 확대/축소 값
	0.5f // z축 방향 확대/축소 값
);

XMMATRIX rotationOrbitCube = XMMatrixRotationY(theta * 2.f);

XMMATRIX translationTransform = XMMatrixTranslation(
	3.f, // x축 변위
	0.f, // y축 변위
	0.f // z축 변위
);

XMMATRIX orbitTransform = XMMatrixRotationY(-theta);

constantBufferForOrbitCube.transfrom = XMMatrixTranspose(scaleTransform * rotationOrbitCube * translationTransform * orbitTransform);

// 바인딩한 리소스 업데이트
spDeviceContext->UpdateSubresource(
	spConstantBuffer, // 업데이트할 서브리소스 포인터
	0, // 업데이트할 서브리소스 번호
	nullptr, // 서브리소스 선택 박스 포인터
	&constantBufferForOrbitCube, // 업데이트에 사용할 데이터
	0, // 다음 행까지의 시스템 메모리 바이트 수
	0 // 다음 깊이까지의 시스템 메모리 바이트 수
);

spDeviceContext->DrawIndexed(
	36, // 그릴 인덱스의 수
	0, // 첫 인덱스를 읽을 위치
	0 // 정점 버퍼로부터 정점을 읽기 전에 각 인덱스에 더할 값
);
~~~

&emsp;요기만 바꿔주면 사실상 거의 다 했습니다. 

절차가 한 눈에 들어오게 정리를 좀 해드리면

1. 중심에서 자전하는 육면체에 적용할 상수 버퍼 초기화
2. 상수 버퍼 업데이트 및 그리기 호출
3. 공전하는 육면체에 적용할 상수 버퍼 초기화
   1. 중심 육면체보다 작게 그릴거라서 축소 변환 생성
   2. 자전해야 하니까 y축 회전 변환 생성
   3. 공전해야 하니까 이동시키기 위해 이동 변환 생성
   4. 이동만 해서는 공전하지 못하니 y축 회전 변환 생성
   5. 연산량을 줄이기 위한 변환 행렬 미리 합치기
4. 상수 버퍼 업데이트 및 그리기 호출

일단 같은 육면체를 그릴 거라 그냥 그리기 두 번만 해줘도 간단하게 그릴 수 있습니다.

##### 변환 행렬 곱하기 참고

&emsp;행렬 곱할 때 적용할 순서대로 우항에 곱해서 합쳤는데 Column-major 방식의 라이브러리를 쓰시면 정반대로 곱하셔야 합니다!

~~~ C++
transform = orbit * translation * rotation * scale;
~~~

&emsp;Column-major 방식이라면 위 코드랑 동일한 결과를 만드는 변환 행렬 합치기는 이렇게 됩니다.

##### 왜 공전 큐브의 자전 각도 값을 두 배로?

&emsp;혹시 공전 큐브 자전 각도 값을 두 배로 잡아놨지? 의문이 드실 수도 있을 것 같습니다. 사실 저도 처음에 실수했던 부분이기도 하고요. <br>
&emsp;이에 대해서 말씀해드리면, 앞서 변환 감잡기에서 본 [예시 그림](#변환-감잡기)을 보면 공전을 하든 자전을 하든 변환된 모양은 같았습니다. 그런데, 저는 현재 큐브의 공전과 자전 방향을 반대로 구현하는 것을 의도하는 상황입니다. 앞선 두 문장에서 짐작할 수 있듯이 똑같은 각도 값으로 방향만 반대로 줘버리면 도형의 상태가 다시 제자리로 돌아오게 되고 회전이 전혀 없는 육면체만 공전하는 상태가 나타나게 됩니다. 그렇기 때문에, 공전으로 인한 회전 효과를 상쇄시키고 원하는 만큼 자전을 하기 위해서는 2배의 자전 각도를 설정해야 의도한 결과를 볼 수 변환이 설정됩니다.

#### 쉐이더 코드

이번 내용에서는 딱히 바꾸지 않아도 됩니다!

#### 1차 결과

![1차 결과](/assets/images/2024-05-12-D3D11_CubeRotationAndOrbit_images/result1.gif)

&emsp;잘 된 것 같...지만 뭔가 이상하죠?

## 코드 살펴보기2

&emsp;어색한 결과가 나타나게된 원인은 그리는 방법 때문입니다. 현재 그리는 방식을 보면

1. 변환을 적용해서 중심 육면체를 그린다.
2. 변환을 적용해서 공전 육면체를 그린다.

입니다. 그런데, 2차원 평면인 스크린에 그릴 때는 별다른 정보를 제공해주지 않으면 그리기 호출(Draw Call)이 발생할 때 마다 겹치는 픽셀 위에 덮어서 새로 그리게 됩니다. 즉, 해당 물체가 뒤에 있어서 그리지 말아야 하는지 그려야 하는지에 정보를 제대로 반영하지 못한다는 것이죠. <br>
&emsp;이러한 문제를 해결하는 가장 간단한 방법은 물체가 뒤로 갔을 때, 조건문을 통해서 그리지 않는 방법을 생각해볼 수 있습니다. C++든, HLSL이든 조건문은 있으니까요. 그러나, 직접 작성하는 것은 꽤나 귀찮은 일이고 GPU의 경우 조건문을 사용하는 것에 따른 성능 저하가 CPU보다 심하게 발생할 수도 있습니다. 그래서 대부분의 그래픽스 라이브러리에서는 깊이 버퍼(Depth Buffer) 기능을 제공해서 이 번거로움을 해결합니다.

### Direct3D11 단계별 접근

&emsp;깊이 버퍼는 다음과 과정을 거쳐서 사용합니다.

1. 2D 자료형(2D 텍스쳐)으로 버퍼 리소스 생성
2. 깊이/스텐실 뷰 생성
3. OM 렌더 타겟 설정시 인자로 함께 전달
4. 그리기 호출 전 초기화

#### 깊이 버퍼 관련 리소스 선언

~~~ C++
// D3D11에서 사용할 변수들
// Device: 리소스 생성
// DeviceContext: 렌더링에 사용할 정보를 담을 데이터 덩어리
// SwapChain: 버퍼를 디바이스에 렌더링하고 출력
// RenderTargetView: 리소스 뷰 중에서 렌더링 대상 용도
// Texture2D: 리소스 중 2D 버퍼 용도
// DepthStencilView: 리소스 뷰 중에서 깊이/스텐실 추적 용도
static ID3D11Device* spDevice;
static ID3D11DeviceContext* spDeviceContext;
static IDXGISwapChain* spSwapChain;
static ID3D11RenderTargetView* spRenderTargetView;
static ID3D11Texture2D* spDepthStencilBuffer;
static ID3D11DepthStencilView* spDepthStencilView;
~~~

&emsp;간만에 새로운 자료형이 들어왔으니 선언해줍시다. 저는 렌더 타겟 설정할 때 같이 하는 녀석이라 렌더 타겟 밑에 함께 선언해주었습니다.

#### 1. 버퍼 리소스 생성, 2. 깊이/스텐실 뷰 생성

~~~ C++
	// 렌더 타겟 뷰 생성
	hr = spDevice->CreateRenderTargetView(
		pBackBuffer, // 사용할 리소스 포인터
		nullptr, // 렌더 타겟 뷰 정보 구조체 포인터
		&spRenderTargetView // 만들어진 렌터 타겟 뷰의 포인터를 받을 주소
	);
	assert(SUCCEEDED(hr));
	pBackBuffer->Release();
	pBackBuffer = nullptr;

	// 깊이/스텐실 버퍼용 리소스 생성
	D3D11_TEXTURE2D_DESC depthBufferDesc;

	depthBufferDesc.Width = windowRect.right; // 텍스쳐 너비
	depthBufferDesc.Height = windowRect.bottom; // 텍스쳐 높이
	depthBufferDesc.MipLevels = 1; // mipmap 수준(level)의 최대 수
	depthBufferDesc.ArraySize = 1; // 텍스쳐 배열에서 텍스쳐의 수
	depthBufferDesc.Format = DXGI_FORMAT_D24_UNORM_S8_UINT; // 텍스쳐의 데이터 형식
	depthBufferDesc.SampleDesc.Count = 1; // 픽셀당 샘플링하는 수
	depthBufferDesc.SampleDesc.Quality = 0; // 이미지 품질 수준
	depthBufferDesc.Usage = D3D11_USAGE_DEFAULT; // 텍스쳐의 용도
	depthBufferDesc.BindFlags = D3D11_BIND_DEPTH_STENCIL; // 파이프라인에 뭘로 바인딩 할지
	depthBufferDesc.CPUAccessFlags = 0; // CPU의 접근 권한
	depthBufferDesc.MiscFlags = 0; // 리소스에 대한 옵션

	hr = spDevice->CreateTexture2D(
		&depthBufferDesc, // 텍스쳐 정보 구조체
		nullptr,  // 서브리소스 데이터
		&spDepthStencilBuffer // 생성된 텍스쳐의 포인터를 받을 주소
	);
	assert(SUCCEEDED(hr));

	D3D11_DEPTH_STENCIL_VIEW_DESC depthStencilViewDesc;

	depthStencilViewDesc.Format = depthBufferDesc.Format; // 뷰의 데이터 형식
	depthStencilViewDesc.ViewDimension = D3D11_DSV_DIMENSION_TEXTURE2D; // 리소스의 자료형
	depthStencilViewDesc.Flags = 0; // 텍스쳐가 읽기 전용인지를 나타내는 플래그
	depthStencilViewDesc.Texture2D.MipSlice = 0; // 첫 번째로 사용할 mipmap 수준의 색인

	hr = spDevice->CreateDepthStencilView(
		spDepthStencilBuffer, // 사용할 리소스 포인터
		&depthStencilViewDesc, // 깊이/스텐실 정보 구조체
		&spDepthStencilView // 깊이/스텐실 뷰 포인터를 받을 주소
	);
	assert(SUCCEEDED(hr));
~~~

&emsp;2D 버퍼로 쓸 2D 텍스쳐 자료형을 만들어주고 깊이/스텐실 뷰를 만들어서 2D 텍스쳐로 표현된 버퍼를 일종의 형변환을 해줍니다. <br>
&emsp;초반부에 작성했던 코드 사이에 집어 넣는 코드라 위치 가이드겸 렌더 타겟 생성 코드를 같이 끼워넣어봤습니다ㅎㅎ

##### 스텐실?

&emsp;스텐실이 뭘까 싶어서 살짝 찾아봤는데, 비트 마스킹처럼 마스크 써서 뭔가 하는 기법을 스텐실이라 부르고 라이브러리에서 깊이 버퍼랑 공유해서 사용할 수 있게끔 돼있는 것 같네요.

#### 3. OM 렌더 타겟 설정시 인자로 함께 전달

~~~ C++
	// 렌더 타겟을 파이프라인 OM 단계에 설정
	spDeviceContext->OMSetRenderTargets(
		1, // 넣을 뷰의 수
		&spRenderTargetView, // 렌터 타겟 포인터 배열
		spDepthStencilView // 깊이 스텐실 뷰 포인터
	);
~~~

&emsp;이렇게 렌더 타겟 설정할 때 그냥 인자로 전달하면 끝납니다!

&emsp;이렇게 깊이 버퍼를 설정하고나면 D3D가 깊이 값을 버퍼에 기록하고 추적하면서 현재 기록된 깊이 값보다 크면 그리지 않고 작거나 같은 경우에만 그리게끔 알아서 조정을 해줍니다. 왜 깊이가 작거나 같을 때만 그리는지는 아시겠죠?(관련 키워드: 왼손 좌표계)

#### 4. 그리기 호출 전 초기화

~~~ C++
	assert(spRenderTargetView != nullptr);
	spDeviceContext->ClearRenderTargetView(
		spRenderTargetView, // 대상 렌더 타겟 뷰
		clearColor // 채워 넣을 색상
	);

	spDeviceContext->ClearDepthStencilView(
		spDepthStencilView, // 대상 깊이/스텐실 뷰
		D3D11_CLEAR_DEPTH, // 지울 데이터 형식
		1.f, // 채워 넣을 깊이값
		UINT8_MAX // 채워 넣을 스텐실 값
	);
~~~

&emsp;이전 렌더링 코드랑 똑같은데, 깊이/스텐실 버퍼 초기화하는 부분만 넣으시면 됩니다. 관리는 따로 하지만 실질적으로 렌터 타겟의 일부라고 볼 수 있어서 초기화 안 하면 렌더링 제대로 안 될 수 있습니다!(저도 실수함) 각 픽셀 값이 작거나 같을 때 갱신되기 때문에, 초기화 값은 특별한 사유가 없을 시 최댓값 넣어서 사용하게 됩니다.

&emsp;이렇게 하고나면 [결과](#결과)에서 보신 것과 같은 결과를 보실 수 있습니다.

### 추가로 살펴보시면 좋을 것 같은 코드 추가

&emsp;`Render()`함수 관련입니다. 주석 바꿔가면서 해보세요!

~~~ C++
	constant_buffer_t constantBufferForOrbitCube = sConstantBuffer;

	XMMATRIX scaleTransform = XMMatrixScaling(
		0.5f, // x축 방향 확대/축소 값
		0.5f, // y축 방향 확대/축소 값
		0.5f // z축 방향 확대/축소 값
	);

	// XMMATRIX rotationOrbitCube = XMMatrixRotationY(theta);
	XMMATRIX rotationOrbitCube = XMMatrixRotationY(theta * 2.f);

	XMMATRIX translationTransform = XMMatrixTranslation(
		3.f, // x축 변위
		0.f, // y축 변위
		0.f // z축 변위
	);

	XMMATRIX orbitTransform = XMMatrixRotationY(-theta);

	constantBufferForOrbitCube.transfrom = XMMatrixTranspose(scaleTransform * rotationOrbitCube * translationTransform * orbitTransform);
	// constantBufferForOrbitCube.transfrom = XMMatrixTranspose(scaleTransform * rotationOrbitCube * translationTransform * orbitTransform * scaleTransform);
	// constantBufferForOrbitCube.transfrom = XMMatrixTranspose(scaleTransform * rotationOrbitCube * translationTransform * orbitTransform * translationTransform);
~~~

&emsp;위 코드를 직접 돌려서 눈으로 확인해보시면 원점에 대한 변환이 어떤 느김인지 감잡을 때 더 도움이 될 것 같아서 추가합니다! <br>
&emsp;이것저것 다른 조합도 해보시는 것도 좋습니다!

## 소스코드 깃 주소

[CubeRotationAndOrbit](https://github.com/redbindy/DX11ForPost/tree/master/CubeRotationAndOrbit)

## 참고자료 및 출처
- [DirectX-SDK-Samples](https://github.com/walbourn/directx-sdk-samples)
- [AlgeoMath](https://www.algeomath.kr/algeo/algeomath/poly/make.do)
- [MSDN - D3D11_TEXTURE2D_DESC structure (d3d11.h)](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/ns-d3d11-d3d11_texture2d_desc)
- [MSDN - D3D11_DEPTH_STENCIL_VIEW_DESC structure (d3d11.h)](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/ns-d3d11-d3d11_depth_stencil_view_desc)
- [MSDN - D3D11_TEX2D_DSV structure (d3d11.h)](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/ns-d3d11-d3d11_tex2d_dsv)
- [디자인프레스 - 가장 오래된 그래픽 기법, 스텐실 (2)](https://m.blog.naver.com/designpress2016/222078342448)
- [ShaderLab: 스텐실](https://docs.unity3d.com/kr/530/Manual/SL-Stencil.html)
- [MSDN - ID3D11DeviceContext::ClearDepthStencilView 메서드(d3d11.h)](https://learn.microsoft.com/ko-kr/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-cleardepthstencilview)
- [MSDN - D3D11_CLEAR_FLAG 열거형(d3d11.h)](https://learn.microsoft.com/ko-kr/windows/win32/api/d3d11/ne-d3d11-d3d11_clear_flag)