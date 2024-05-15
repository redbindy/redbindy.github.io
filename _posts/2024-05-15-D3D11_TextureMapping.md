---
layout: post
title: "Direct3D11 튜토리얼 정리7: 육면체 텍스쳐 씌우기 (완결)"
category: 컴퓨터공학
tags: [C/C++, D3D11, Direct3D11]
---

## 이전 게시글

&emsp;이전 게시글에서 내용과 코드가 이어집니다. 안 보고 오셨다면

### [Direct3D11 튜토리얼 정리1: 화면 지우기](/컴퓨터공학/2024/03/20/D3D11_ClearScreen.html)
### [Direct3D11 튜토리얼 정리2: 삼각형 그리기](/컴퓨터공학/2024/03/29/D3D11_DrawTriangle.html)
### [Direct3D11 튜토리얼 정리3: 간단한 쉐이더 활용](/컴퓨터공학/2024/04/03/D3D11_SimpleShader.html)
### [Direct3D11 튜토리얼 정리4: 육면체 그리기 및 3D 공간](/컴퓨터공학/2024/05/09/D3D11_DrawCubeAnd3DSpace.html)
### [Direct3D11 튜토리얼 정리5: 3차원 변환을 활용한 공전, 자전 육면체 그리기](/컴퓨터공학/2024/05/12/D3D11_CubeRotationAndOrbit.html)
### [Direct3D11 튜토리얼 정리6: 간단한 라이팅 구현(사실 라이팅 아님)](/컴퓨터공학/2024/05/14/D3D11_SimpleLighting.html)

&emsp;먼저 보시는 것도 추천!

## 결과

![결과 이미지](/assets/images/2024-05-15-D3D11_TextureMapping_images/result.gif)

&emsp;앞서 했던 거에서 라이팅은 빼고(넣어서 하셔도 가능은 합니다.) 텍스쳐를 씌워서 위와 같이 만들어봅시다.

&emsp;정리 시리즈 다 끝났네요. 혹시라도 다 보신 분이 계시다면 고생하셨다는 말씀들 드립니다!

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

#include "DDSTextureLoader11.h"
#pragma comment(lib, "./DirectXTex.lib")

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
	XMFLOAT2 texCoord; // 텍스쳐 좌표
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

// ShaderResourceView: 쉐이더 리소스 뷰
// 
ID3D11ShaderResourceView* spTextureResourceView;
ID3D11SamplerState* spSampler;

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

	D3D11_INPUT_ELEMENT_DESC vertexLayoutDescForTexcoord;

	vertexLayoutDescForTexcoord.SemanticName = "TEXCOORD"; // 해당 데이터의 용도
	vertexLayoutDescForTexcoord.SemanticIndex = 0; // 용도가 겹칠 경우 사용할 색인 번호
	vertexLayoutDescForTexcoord.Format = DXGI_FORMAT_R32G32_FLOAT; // 입력 데이터 형식
	vertexLayoutDescForTexcoord.InputSlot = 0; // 버퍼의 슬롯 번호
	vertexLayoutDescForTexcoord.AlignedByteOffset = sizeof(vertex_t::pos); // 구조체에서 요소의 시작 위치(바이트 단위)
	vertexLayoutDescForTexcoord.InputSlotClass = D3D11_INPUT_PER_VERTEX_DATA; // 입력 데이터의 분류법
	vertexLayoutDescForTexcoord.InstanceDataStepRate = 0; // 인스턴싱에 사용할 배수

	// 파이프라인에 전송할 레이아웃 배열
	D3D11_INPUT_ELEMENT_DESC layoutArr[] = {
		vertexLayoutDescForPos,
		vertexLayoutDescForTexcoord
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
	vertex_t vertices[] = {
		{ { 1.f, 1.f, -1.f }, { 1.f, 0.f } }, // 정면 
		{ { 1.f, -1.f, -1.f }, { 1.f, 1.f } },
		{ { -1.f, 1.f, -1.f }, { 0.f, 0.f } },
		{ { -1.f, -1.f, -1.f }, { 0.f, 1.f } },

		{ { 1.f, 1.f, -1.f }, { 0.f, 0.f } }, // 우측 
		{ { 1.f, -1.f, -1.f }, { 0.f, 1.f } },
		{ { 1.f, 1.f, 1.f }, { 1.f, 0.f } },
		{ { 1.f, -1.f, 1.f }, { 1.f, 1.f } },

		{ { 1.f, 1.f, 1.f }, { 0.f, 0.f } }, // 뒷면 
		{ { 1.f, -1.f, 1.f }, { 0.f, 1.f } },
		{ { -1.f, 1.f, 1.f }, { 1.f, 0.f } },
		{ { -1.f, -1.f, 1.f }, { 1.f, 1.f } },

		{ { -1.f, 1.f, -1.f }, { 1.f, 0.f } }, // 좌측 
		{ { -1.f, -1.f, -1.f }, { 1.f, 1.f } },
		{ { -1.f, 1.f, 1.f }, { 0.f, 0.f } },
		{ { -1.f, -1.f, 1.f }, { 0.f, 1.f } },

		{ { 1.f, 1.f, -1.f }, { 1.f, 1.f } }, // 윗면 
		{ { -1.f, 1.f, -1.f }, { 0.f, 1.f } },
		{ { 1.f, 1.f, 1.f }, { 0.f, 1.f } },
		{ { -1.f, 1.f, 1.f }, { 0.f, 0.f } },

		{ { 1.f, -1.f, -1.f }, { 0.f, 1.f } }, // 아랫면
		{ { -1.f, -1.f, -1.f }, { 1.f, 1.f } },
		{ { 1.f, -1.f, 1.f }, { 0.f, 0.f } },
		{ { -1.f, -1.f, 1.f }, { 1.f, 0.f } },
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
	WORD indice[] = {
		0, 1, 2, // 정면
		2, 1, 3,

		4, 6, 7, // 우측면
		7, 5, 4,

		8, 10, 9, // 뒷면
		10, 11, 9,

		12, 13, 15, // 좌측면
		15, 14, 12,

		16, 17, 19, // 윗면
		19, 18, 16,

		20, 22, 21, // 아랫면
		21, 22, 23
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

	// 텍스쳐 불러오기
	hr = CreateDDSTextureFromFile(
		spDevice, // 사용할 디바이스 포인터
		TEXT("seafloor.dds"), // 파일 이름
		nullptr, // 텍스쳐 데이터를 받을 리소스 포인터의 주소
		&spTextureResourceView // 텍스쳐를 받을 리소스 뷰 포인터의 주소
	);

	// 샘플러 정보 구조체
	D3D11_SAMPLER_DESC samplerDesc;

	samplerDesc.Filter = D3D11_FILTER_MIN_MAG_MIP_LINEAR; // 텍스쳐를 샘플링할 때 사용할 필터링 방법
	samplerDesc.AddressU = D3D11_TEXTURE_ADDRESS_WRAP; // 범위를 벗어나는 u좌표 처리 방법
	samplerDesc.AddressV = D3D11_TEXTURE_ADDRESS_WRAP; // 범위를 벗어나는 v좌표 처리 방법
	samplerDesc.AddressW = D3D11_TEXTURE_ADDRESS_WRAP; // 범위를 벗어나는 w좌표 처리 방법
	samplerDesc.MipLODBias = 0; // mipmap 수준(level)로부터 계산된 오프셋
	samplerDesc.MaxAnisotropy = 0; // 특정 필터 옵션이 지정된 경우 사용되는 클램핑 값
	samplerDesc.ComparisonFunc = D3D11_COMPARISON_NEVER; // 기존 샘플링된 데이터와 샘플링한 데이터를 비교하는 함수
	samplerDesc.MinLOD = 0; // 클램핑할 mipmap 범위의 하단
	samplerDesc.MaxLOD = D3D11_FLOAT32_MAX; // 클램핑할 mipmap 범위의 상단

	hr = spDevice->CreateSamplerState(
		&samplerDesc, // 샘플러 정보
		&spSampler // 샘플러 포인터를 받을 주소
	);
	assert(SUCCEEDED(hr));
}

void DestroyD3D11()
{
	if (spSampler != nullptr)
	{
		spSampler->Release();
		spSampler = nullptr;
	}

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

	spDeviceContext->PSSetShaderResources(
		0, // 슬롯 번호
		1, // 뷰의 수
		&spTextureResourceView // 쉐이더 리소스뷰의 배열
	);

	spDeviceContext->PSSetSamplers(
		0, // 슬롯 번호
		1, // 뷰의 수
		&spSampler // 샘플러 배열
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
    float2 texCoord : TEXCOORD;
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

Texture2D txDiffuse : register(t0);
SamplerState samLinear : register(s0);

float4 main(PS_INPUT input) : SV_TARGET
{
    return txDiffuse.Sample(samLinear, input.texCoord) * float4(1.f, 1.f, 1.f, 1.f);
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
    float2 texCoord : TEXCOORD;
};

typedef VS_OUTPUT PS_INPUT;
~~~

## 준비사항

&emsp;다른 것들과 다르게 이번엔 준비할 게 있습니다. D3D에서는 DDS라는 전용 이미지 형식을 사용하고 있는데 관련 라이브러리가 기본이 아니고 별도로 넣어야 합니다... nuget 같은 걸로 할 수도 있는 것 같지만 일단 새로운 경험도 해볼겸 깃허브에서 다운로드 받아서 사용해봅시다.

### 라이브러리 다운로드 및 빌드

#### 텍스쳐 다운로드

<https://github.com/walbourn/directx-sdk-samples/blob/main/Direct3D11Tutorials/Tutorial07/seafloor.dds>

&emsp;요거 다운로드 받아주시고(경로는 지정하면 되니까 아무데나 저장하세요ㅋㅋ 저는 솔루션 폴더!)

#### 1. DirectXTex 다운로드

&emsp;[DirectXTex](https://github.com/microsoft/DirectXTex) 여기 들어가서 코드 다운로드 해주세요.

![다운로드 zip](/assets/images/2024-05-15-D3D11_TextureMapping_images/DownloadZip.jpg)

~~쓸데없이 친절한 사진~~

#### 2. 압축 해제 후 빌드

![솔루션 선택지](/assets/images/2024-05-15-D3D11_TextureMapping_images/SolutionSelection.jpg)

&emsp;압축 풀고 나서 들어가면 위처럼 나올텐데 여기서 Desktop 솔루션을 켜서 빌드해줍니다. 디버그 릴리즈 둘다 필요하시면 둘 다 모드 설정해서 빌드 하셔야 합니다.<br>
&emsp;밑에 Windows10은 UWP용이라 지금 제 작성글에서는 버전이 안 맞을 수도 있어서 쓰지 않을 겁니다. 이거 주의하세요!

#### 3. DirectXTex.lib 및 DDSTextureLoader 가져오기

![DXTex lib 파일](/assets/images/2024-05-15-D3D11_TextureMapping_images/DXTexLib.jpg)

&emsp;디버그용 빌드 기준으로 DirectXTex/Bin/Desktop_2022_Win10/x64/Debug로 이동해주시면 DirectXTex.lib이 생성되어 있을 겁니다. 요거 복사해서 솔루션 폴더에 넣어주세요. 다른 데 넣으셔도 되는데, 일단 그렇게 하는 게 경로 관리 편할 것 같습니다ㅎㅎ 그리고 lib만 들고 와도 작동하는 것 같네요.

![DDS 로더](/assets/images/2024-05-15-D3D11_TextureMapping_images/DDSLoader.jpg)

&emsp;그 다음 다시 솔루션 몰려있던 곳에서 DDSTextureLoader 폴더로 들어가셔서 DDSTextureLoader11.h, DDSTextureLoader11.cpp 파일을 솔루션에 폴더에 넣어주세요.

#### 4. 솔루션에 DDS 로더 헤더 및 cpp 파일 등록

&emsp;요건 다 하실 수 있을테니 생략!

이제 준비 다 됐습니다. 코드 보러 가시죠!

## 코드 살펴보기

### 사용할 라이브러리 및 컴파일러 옵션

~~~ C++
#include "DDSTextureLoader11.h"
#pragma comment(lib, "./DirectXTex.lib")
~~~

&emsp;앞에서 열심히 갖고 왔던 헤더 포함시켜주고 라이브러리 연결해줍시다.

### 윈도우 관련 코드

이전과 동일

### Direct3D11

다음과 같은 과정으로 진행될 예정입니다.

1. 정점, 상수 버퍼 정의 변경
2. 정점 데이터 변경
3. 텍스쳐 로딩
4. 샘플러 생성
5. 텍스쳐, 샘플러 픽셀 쉐이더에 설정
6. 쉐이더 변경 및 렌더링

#### 1. 정점 정의 변경

~~~ C++
// 사용할 정점 구조체
// 위치 정보 외에도 다양한 데이터가 추가될 수 있음
typedef struct
{
	XMFLOAT3 pos; // 단순 (x, y, z)를 표현하기 위해 float3 사용
	XMFLOAT2 texCoord; // 텍스쳐 좌표
} vertex_t;

typedef struct
{
	XMMATRIX world;
	XMMATRIX view;
	XMMATRIX projection;

	XMMATRIX transfrom; // 정점 변환용 변수
} constant_buffer_t;
~~~

&emsp;코드 볼륨을 조금 줄일 겸 살짝 변경했는데, 이번엔 정점에 법선 벡터 정보 대신 텍스쳐 좌표만 넣었습니다. 여기서 2차원 텍스쳐를 쓸 거라 float2를 쓰긴 했지만 3차원 1차원 텍스쳐도 있습니다. 필요에 따라서 사용하시길ㅎㅎ <br>
&emsp;상수 버퍼도 법선 벡터가 빠졌으니 원래대로 돌아갔습니다.

#### 2. 정점, 상수 버퍼 데이터 변경

~~~ C++
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

	D3D11_INPUT_ELEMENT_DESC vertexLayoutDescForTexcoord;

	vertexLayoutDescForTexcoord.SemanticName = "TEXCOORD"; // 해당 데이터의 용도
	vertexLayoutDescForTexcoord.SemanticIndex = 0; // 용도가 겹칠 경우 사용할 색인 번호
	vertexLayoutDescForTexcoord.Format = DXGI_FORMAT_R32G32_FLOAT; // 입력 데이터 형식
	vertexLayoutDescForTexcoord.InputSlot = 0; // 버퍼의 슬롯 번호
	vertexLayoutDescForTexcoord.AlignedByteOffset = sizeof(vertex_t::pos); // 구조체에서 요소의 시작 위치(바이트 단위)
	vertexLayoutDescForTexcoord.InputSlotClass = D3D11_INPUT_PER_VERTEX_DATA; // 입력 데이터의 분류법
	vertexLayoutDescForTexcoord.InstanceDataStepRate = 0; // 인스턴싱에 사용할 배수

	// 파이프라인에 전송할 레이아웃 배열
	D3D11_INPUT_ELEMENT_DESC layoutArr[] = {
		vertexLayoutDescForPos,
		vertexLayoutDescForTexcoord
	};
~~~

&emsp;여긴 이제 별로 설명 할 게 없을 것 같네요ㅋㅋ 다만, 2차원 텍스쳐 쓸 거라 float2니까 잊지 말고 format 변경해주십쇼!

~~~ C++
// 전송할 정점 배열
vertex_t vertices[] = {
	{ { 1.f, 1.f, -1.f }, { 1.f, 0.f } }, // 정면 
	{ { 1.f, -1.f, -1.f }, { 1.f, 1.f } },
	{ { -1.f, 1.f, -1.f }, { 0.f, 0.f } },
	{ { -1.f, -1.f, -1.f }, { 0.f, 1.f } },

	{ { 1.f, 1.f, -1.f }, { 0.f, 0.f } }, // 우측 
	{ { 1.f, -1.f, -1.f }, { 0.f, 1.f } },
	{ { 1.f, 1.f, 1.f }, { 1.f, 0.f } },
	{ { 1.f, -1.f, 1.f }, { 1.f, 1.f } },

	{ { 1.f, 1.f, 1.f }, { 0.f, 0.f } }, // 뒷면 
	{ { 1.f, -1.f, 1.f }, { 0.f, 1.f } },
	{ { -1.f, 1.f, 1.f }, { 1.f, 0.f } },
	{ { -1.f, -1.f, 1.f }, { 1.f, 1.f } },

	{ { -1.f, 1.f, -1.f }, { 1.f, 0.f } }, // 좌측 
	{ { -1.f, -1.f, -1.f }, { 1.f, 1.f } },
	{ { -1.f, 1.f, 1.f }, { 0.f, 0.f } },
	{ { -1.f, -1.f, 1.f }, { 0.f, 1.f } },

	{ { 1.f, 1.f, -1.f }, { 1.f, 1.f } }, // 윗면 
	{ { -1.f, 1.f, -1.f }, { 0.f, 1.f } },
	{ { 1.f, 1.f, 1.f }, { 0.f, 1.f } },
	{ { -1.f, 1.f, 1.f }, { 0.f, 0.f } },

	{ { 1.f, -1.f, -1.f }, { 0.f, 1.f } }, // 아랫면
	{ { -1.f, -1.f, -1.f }, { 1.f, 1.f } },
	{ { 1.f, -1.f, 1.f }, { 0.f, 0.f } },
	{ { -1.f, -1.f, 1.f }, { 1.f, 0.f } },
};

	// 인덱스 데이터 정의
	WORD indice[] = {
		0, 1, 2, // 정면
		2, 1, 3,

		4, 6, 7, // 우측면
		7, 5, 4,

		8, 10, 9, // 뒷면
		10, 11, 9,

		12, 13, 15, // 좌측면
		15, 14, 12,

		16, 17, 19, // 윗면
		19, 18, 16,

		20, 22, 21, // 아랫면
		21, 22, 23
	};
~~~

&emsp;법선 벡터때랑 사실상 똑같습니다. 다만, 텍스쳐 방향에 맞게 잘 설정해줘야 합니다.

&emsp;상수 버퍼쪽은 데이터가 빠지기만 했다보니 할 게 없어서 생략하겠습니다ㅋㅋ

##### uv 좌표계

![uv 좌표계](/assets/images/2024-05-15-D3D11_TextureMapping_images//UVCoordinates.jpg)

&emsp;텍스쳐를 사용할 때는 위 사진과 같은 좌표계를 따릅니다. NDC랑 좌표계가 조금 다르니 주의!

#### 3. 텍스쳐 로딩

~~~ C++
	// 텍스쳐 불러오기
	hr = CreateDDSTextureFromFile(
		spDevice, // 사용할 디바이스 포인터
		TEXT("seafloor.dds"), // 파일 이름
		nullptr, // 텍스쳐 데이터를 받을 리소스 포인터의 주소
		&spTextureResourceView // 텍스쳐를 받을 리소스 뷰 포인터의 주소
	);
~~~

&emsp;앞에서 열심히 갖고 왔던 DDS 로더를 이용해서 텍스쳐를 불러옵니다. 여기서는 모르는 텍스쳐 데이터가 아니니까 리소스는 받지 않고 바로 뷰만 받아서 사용합니다.

#### 4. 샘플러 생성

~~~ C++
	// 샘플러 정보 구조체
	D3D11_SAMPLER_DESC samplerDesc;

	samplerDesc.Filter = D3D11_FILTER_MIN_MAG_MIP_LINEAR; // 텍스쳐를 샘플링할 때 사용할 필터링 방법
	samplerDesc.AddressU = D3D11_TEXTURE_ADDRESS_WRAP; // 범위를 벗어나는 u좌표 처리 방법
	samplerDesc.AddressV = D3D11_TEXTURE_ADDRESS_WRAP; // 범위를 벗어나는 v좌표 처리 방법
	samplerDesc.AddressW = D3D11_TEXTURE_ADDRESS_WRAP; // 범위를 벗어나는 w좌표 처리 방법
	samplerDesc.MipLODBias = 0; // mipmap 수준(level)로부터 계산된 오프셋
	samplerDesc.MaxAnisotropy = 0; // 특정 필터 옵션이 지정된 경우 사용되는 클램핑 값
	samplerDesc.ComparisonFunc = D3D11_COMPARISON_NEVER; // 기존 샘플링된 데이터와 샘플링한 데이터를 비교하는 함수
	samplerDesc.MinLOD = 0; // 클램핑할 mipmap 범위의 하단
	samplerDesc.MaxLOD = D3D11_FLOAT32_MAX; // 클램핑할 mipmap 범위의 상단

	hr = spDevice->CreateSamplerState(
		&samplerDesc, // 샘플러 정보
		&spSampler // 샘플러 포인터를 받을 주소
	);
	assert(SUCCEEDED(hr));
~~~

&emsp;텍스쳐링은 샘플러를 통해서 텍스쳐를 샘플링하고 그 값을 물체에 입히는 방식으로 진행되기 때문에 샘플러를 만들어줍니다. <br>
&emsp;샘플러 자체는 그냥 Device 같이 샘플링을 쉽게 할 수 있도록 도와주는 구조체 같은 녀석입니다.

#### 5. 텍스쳐, 샘플러 픽셀 쉐이더에 설정

~~~ C++
spDeviceContext->PSSetShaderResources(
	0, // 슬롯 번호
	1, // 뷰의 수
	&spTextureResourceView // 쉐이더 리소스뷰의 배열
);

spDeviceContext->PSSetSamplers(
	0, // 슬롯 번호
	1, // 뷰의 수
	&spSampler // 샘플러 배열
);
~~~

&emsp;만들어준 텍스쳐뷰랑 샘플러를 설정해주면 렌더링할 준비 끝입니다! 나머지 코드는 상수 버퍼 때랑 마찬가지라서 생략! <br>
&emsp;여담으로 샘플러랑 텍스쳐 둘 다 다른 파이프라인에다 설정해서 사용 가능합니다. 이점 한 번 봐두면 좋을 것 같네요.

#### 6. 쉐이더 변경 및 렌더링

##### ShaderHeader.hlsli

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
    float2 texCoord : TEXCOORD;
};

typedef VS_OUTPUT PS_INPUT;
~~~

&emsp;바뀐 부분에 맞게 같이 바꿔줍니다. 그런데, 큰 차이는 없죠?ㅋㅋ

##### VertexShader.hlsl

~~~ HLSL
#include "ShaderHeader.hlsli"

struct VS_INPUT
{
    float4 pos : POSITION;
    float2 texCoord : TEXCOORD;
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

&emsp;정점 쉐이더도 거의 동일합니다.

##### PixelShader.hlsl

~~~ HLSL
#include "ShaderHeader.hlsli"

Texture2D txDiffuse : register(t0);
SamplerState samLinear : register(s0);

float4 main(PS_INPUT input) : SV_TARGET
{
    return txDiffuse.Sample(samLinear, input.texCoord) * float4(1.f, 1.f, 1.f, 1.f);
}
~~~

&emsp;픽셀 쉐이더가 그나마 변화가 큽니다. 크게 설명할 부분은 없지만 그래도 절차를 정리해보면

1. 텍스쳐 자료형 선언(t레지스터)
2. 샘플러 자료형 선언(s레지스터)
3. '텍스쳐에서' 샘플 함수 호출하고 인자로 샘플러와 텍스쳐 좌표를 넘김
4. 색상값 곱해서 최종 텍스쳐 반환

이렇게 정리가 됩니다. 여기서 저는 강한 백색광 고정으로 색상값을 곱했지만 이전 챕터에서 했던 라이팅 같은 걸 도입하면 같은 텍스쳐여도 또 다른 느낌의 육면체를 만들 수 있습니다.

## 소스코드 깃 주소

[TextureMapping](https://github.com/redbindy/DX11ForPost/tree/master/TextureMapping)

## 마무리 겸 정리

&emsp; 튜토리얼 한 번 쭉 봤고 마무리 할 겸 전체적인 흐름 다시 보면서 글을 끝 마쳐 보겠습니다.

1. 디바이스, 디바이스 컨텍스트, 스왑체인 생성
   - 디바이스: 리소스 생성 관리
   - 디바이스 컨텍스트: 파이프라인 정보 관리
   - 스왑체인: 버퍼, 버퍼링 관련 관리
2. 스왑체인 버퍼를 하나 가져와서 렌터 타겟 뷰로 설정
3. 깊이/스텐실 버퍼 생성
   - 자료형으로 Texture2D 사용
4. 깊이/스텐실 뷰 생성
5. OM 단계에 렌더 타겟과 깊이 스텐실 뷰를 바인딩
   - OM 단계는 최종 출력 픽셀 값을 결정
6. 뷰 포트 정보 초기화
7. RS 단계에 뷰포트 설정
8. 정점 레이아웃 생성
   - 생성 전에 컴파일된 쉐이더 데이터 필요함
   - 각 성분 DESC 배열 형태
9.  IA단계에 바인딩
   - IA 단계는 파이프라인 시작 부분
10. 정점에 대한 데이터를 만들고 정점 버퍼 리소스를 생성
    - 필요에 따라 인덱스 버퍼도 함께 생성
    - 사실상 무조건 인덱스 버퍼 같이 씀
11. IA 단계에 생성한 정점 리소스 바인딩
    - PrimitiveTopology를 통해서 정점 그리는 방법 선택
12. 상수 버퍼 생성 필요한 쉐이더에 설정
13. 텍스쳐 리소스 생성 및 리소스 뷰 생성
14. 샘플러 생성
15. 필요한 쉐이더에 텍스쳐 및 샘플러 설정
16. 렌더 타겟, 깊이/스텐실 버퍼 초기화 후 렌더링
    - 필요에 따라서 쉐이더 설정
    - 리소스 업데이트 후 UpdateSubresource를 수행
    - 그리기 호출(Draw call)을 하고(디바이스 컨텍스트) present 호출(스왑체인)

## 참고자료 및 출처
- [DirectX-SDK-Samples](https://github.com/walbourn/directx-sdk-samples)
- [DirectXTex](https://github.com/microsoft/DirectXTex)
- [Texture Coordinates (Direct3D 9)](https://learn.microsoft.com/en-us/windows/win32/direct3d9/texture-coordinates)
- [D3D11_SAMPLER_DESC structure (d3d11.h)](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/ns-d3d11-d3d11_sampler_desc)