---
layout: post
title: "Direct3D11 튜토리얼 정리4: 육면체 그리기 및 3D 공간"
category: 컴퓨터공학
tags: [C/C++, D3D11, Direct3D11]
---

## 이전 게시글

&emsp;이전 게시글에서 내용과 코드가 이어집니다. 안 보고 오셨다면

### [Direct3D11 튜토리얼 정리1: 화면 지우기](/컴퓨터공학/2024/03/20/D3D11_ClearScreen.html)
### [Direct3D11 튜토리얼 정리2: 삼각형 그리기](/컴퓨터공학/2024/03/29/D3D11_DrawTriangle.html)
### [Direct3D11 튜토리얼 정리3: 간단한 쉐이더 활용](/컴퓨터공학/2024/04/03/D3D11_SimpleShader.html)

&emsp;먼저 보시는 것도 추천!

## 결과

![결과 이미지](/assets/images/2024-05-09-D3D11_DrawCubeAnd3DSpace_images/result.gif)

&emsp;요렇게 알록달록한 육면체를 회전시키는 걸 작성해볼 겁니다.

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
	sConstantBuffer.transfrom = XMMatrixRotationY(theta);

	// HLSL 계산 방식으로 인한 전치
	sConstantBuffer.transfrom = XMMatrixTranspose(sConstantBuffer.transfrom);

	// 바인딩한 리소스 업데이트
	spDeviceContext->UpdateSubresource(
		spConstantBuffer, // 업데이트할 서브리소스 포인터
		0, // 업데이트할 서브리소스 번호
		nullptr, // 서브리소스 선택 박스 포인터
		&sConstantBuffer, // 업데이트에 사용할 데이터
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

## 코드 살펴보기

### 사용할 라이브러리 및 컴파일러 옵션

이전과 동일

### 단계별 접근

&emsp;이번엔 글 형식을 조금 바꿔보겠습니다. 이전까지는 사실상 2D 공간을 다루는 거라 직관적인 부분이 많아서 사용법만 다루고 넘어가도 괜찮았지만 3차원부터는 필요 정보 하나 더 늘어난 만큼 고려해야 할 것들이 더 많아집니다.

#### 정점 데이터 변경 정의

~~~ C++
// 사용할 정점 구조체
// 위치 정보 외에도 다양한 데이터가 추가될 수 있음
typedef struct
{
	XMFLOAT3 pos; // 단순 (x, y, z)를 표현하기 위해 float3 사용
	XMFLOAT4 color; // Red, Green, Blue, Alpha를 표현하기 위한 float4
} vertex_t;
~~~

&emsp;본격적으로 물체를 정의하기 전에 일단 정점을 조금 바꿔봤습니다. 색상만 간단하게 추가해봤고 특별한 이유는 없습니다ㅋㅋ

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
~~~

&emsp;정점 데이터 레이아웃이 변했으므로 이렇게 추가로 DESC를 만들어서 넘겨주셔야 합니다. 방법은 비슷하니까 샘플에서 잘 변형하면 되니까 자세한 설명은 생략!

#### 물체 데이터 정의

~~~ C++
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
~~~

&emsp;육면체를 그릴 예정이니 8개의 정점을 정의해줍시다. 제가 기존에 작성해놓은 코드에서는 삼각형 정점 정의를 이렇게 바꾸는 것 빼고는 굳이 변경하실 필요 없습니다.

~~~ C++
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
~~~

&emsp;정점 데이터가 크기가 더 커져서 인덱스 버퍼의 가치가 더 높아졌습니다. 그러니 인덱스도 잘 정의해줍시다. 여기도 마찬가지로 나머지 코드는 굳이 변경하실 필요 없습니다. <br>
&emsp;근데 잘 보시면 그냥 무난하게 인덱스를 배치한 게 아니라 왔다갔다 이상하게 배치해놨죠? 이게 3D 공간과 관계가 있습니다...만 나중에 봅시다ㅋㅋ

#### 렌더링 코드 변경

~~~ C++
const FLOAT clearColor[4] = { 0.5f, 0.5f, 0.5f, 1.f };
~~~

&emsp;배경색을 좀 바꿔봤습니다. 이전에 썼던 보라색 바탕은 눈이 좀 아플 것 같아서 회색으로 바꿔봤습니다ㅎㅎ

~~~ C++
	spDeviceContext->DrawIndexed(
		36, // 그릴 인덱스의 수
		0, // 첫 인덱스를 읽을 위치
		0 // 정점 버퍼로부터 정점을 읽기 전에 각 인덱스에 더할 값
	);
~~~

&emsp;그릴 인덱스 수만 바꾸면 끝!

#### 1차 결과 확인

![1차 결과 이미지](/assets/images/2024-05-09-D3D11_DrawCubeAnd3DSpace_images/result1.jpg)

&emsp;네 아무것도 없습니다.

## 3D 공간

&emsp;앞서 아무 것도 그려지지 않은 것은 스크린에 물체가 잘 그려지게끔 충분한 정보를 주지 못했기 때문입니다. 정보를 주는 일 자체는 함수를 쓰면 간단하게 가능하지만 어떻게 보면 굳이 이렇게 귀찮은 일을 해야 하나 싶은 생각도 들 수 있는 부분이기에 이론적일 수도 있는 내용도 같이 넣어보고자 합니다.

&emsp;여담으로 몇몇 이론 자체는 2D에도 똑같이 써먹을 수 있는 것도 있긴 합니다ㅎㅎ

### 3D 공간 좌표계

![3D 공간 좌표계](/assets/images/2024-05-09-D3D11_DrawCubeAnd3DSpace_images/CoordinateSystem.png)

&emsp;저희가 통상적으로 알고 있는 좌표계를 데카르트 좌표계라고 합니다. 그런데, 그림에서 볼 수 있는 것처럼 기준을 어디로 두냐에 따라서 정보를 제공하는 방법이 달라질 수 있습니다. <br>
&emsp;예를 들어, 그림에서 왼손 좌표계든 오른손 좌표계든 x, y의 정보를 전달하는 방법은 같겠지만 z의 값의 의미는 왼손 좌표계의 경우 음수 값일 때 화면쪽으로 가까워지는 방향일 것이고 양수일 때 화면에서 멀어지는 방향으로 정보가 표현됩니다. 오른손 좌표계면 반대로 되겠죠? <br>
&emsp;이렇듯 좌표계를 어떻게 설정하냐에 따라서 표현 방법이 달라질 수 있기 때문에 일차적으로 어떤 좌표계를 사용할지 선택을 해야합니다. 이 글에서는 Direct3D 라이브러리의 기본적인 사용 방법인 왼손 좌표계를 사용하도록 하겠습니다.

#### 왼손 좌표계와 오른손 좌표계 구분 방법

![좌표계와 손](/assets/images/2024-05-09-D3D11_DrawCubeAnd3DSpace_images/CoordinateSystemWithHand.gif)

&emsp;엄지 손가락은 z축으로 잡고 손을 쥐었을 때, 손가락을 감아쥐는 방향이 x축 $\rightarrow$ y축 방향이 됩니다. 아니면 반대로 생각하셔서 감아쥐는 방향을 먼저 고려하고 엄지 손가락 방향으로 생각하셔도 좋습니다. 왼손으로 감아쥐고 보니 엄지가 화면에서 멀어지는 방향인 거고 오른손으로 감아쥐고 보니 화면에 가까워지는 방향으로 엄지가 가리키고 있다는 식으로요!

#### 인덱스 버퍼의 배치 순서

&emsp;[여기서](#물체-데이터-정의) 언급했던 부분을 드디어 얘기할 수 있게 됐습니다. 2D 공간과 달리 3D 공간의 물체는 앞면과 뒷면을 엄격하게 구분해줄 필요가 있습니다. 이유에 대해서는 간단하게 모든 면을 동시에 볼 수 없으니, 그리기 여부에 대해서 빠르게 판단하기 위함이다. 정도로 생각해주셔도 좋을 것 같습니다. <br>
&emsp;그런데, 앞뒷면을 판단하려면 그에 맞는 기준이 있어야 할 것입니다. 그래픽스에서는 그 기준으로 항상 면 바깥으로 향하는 법선 벡터(Normal Vector)를 사용합니다. 벡터는 삼각형 정점에 대해 외적을 하여 구하게 되는데, 그렇기 때문에 이 부분이 왼손, 오른손 좌표계와 맞물리면서 정점 배치 방법이 달라지게 되고 면에 맞게끔 세팅하느라 인덱스를 곧이 곧대로 넣을 수 없는 상황에 처하게 됩니다.

![법선 벡터 방향](/assets/images/2024-05-09-D3D11_DrawCubeAnd3DSpace_images/NormalDirection.jpg)

&emsp;위 그림은 왼손 좌표계일 때 정점 배치 방법에 따라서 어느 방향을 가리키게 될지 그림판으로 허접하게 그려봤습니다. 엄지 손가락을 외적에서 생성되는 벡터로 설정하고 살펴보면, 대각선 우측 상단은 시계방향으로 배치했을 때를 가정한 것으로 물체 바깥을 향함을 알 수 있습니다. 반면에, 대각선 좌측 하단에 반시계 방향으로 배치했을 때를 가정한 경우를 보면 물체 안 쪽으로 향하게 됨을 알 수 있습니다. 이를 바탕으로 오른손 좌표계인 경우를 생각해본다면, 앞에서 설명한 결과의 반대가 될 거라는 것도 금방 짐작할 수 있습니다. <br>
&emsp;이렇듯 좌표계를 선택하는 방법에 따라서 정점 배치 방법 등이 달라질 수 있기 때문에 이를 고려하여 코드를 작성해야 합니다!

### 그래픽스에서 공간 좌표계

&emsp;그래픽스에서는 크게 물체 공간, 월드 공간, 뷰 공간, 투영 공간, 스크린 공간으로 나눈다고 합니다. 여기서, 각 공간은 앞서 살펴본 데카르트 3차원 좌표계를 따릅니다. 그럼 각각에 대해서 간단하게 살펴봅시다.

#### 물체 공간(Object Space)

- 모델 공간(Model Space)이라고도 함
- 모델의 중심을 원점으로 본 공간
- 정점 쉐이더의 입력 값들도 이에 속하기도 함

#### 월드 공간(World Space)

- 장면(Scene) 안에 모든 물체들이 공유하는 공간
- 물체들 사이 공간적 관계를 정의
- 기준이 되는 공통 좌표계를 위해 사용

#### 뷰 공간(View Space)

- 카메라 공간(Camera Space)이라고도 함
- 관찰자(= 카메라)의 시선과 관계되며 월드 공간과 비슷함
- 관찰자가 원점 위쪽을 y축 양의 방향 시선 방향을 z축 양의 방향으로 설정함

#### 투영 공간(Project Space)

- 뷰 공간에서 투영 변환한 공간
- 투영을 한 후 NDC 좌표계로 변환됨
  - D3D 기준 $X, Y[-1, 1]~Z[0, 1]$

#### 화면 공간(Screen Space)

- 프레임 버퍼들의 장소라고도 함
- 2D 공간
- (0, 0) ~ (w - 1, h - 1)의 범위를 가짐
  - w는 너비 픽셀 수, h는 높이 픽셀 수

### 공간 변환

&emsp;대충 공간에 대해서 살짝 맛을 봤고 간단하게 감잡고 변환 순서에 대해서 살펴보겠습니다. 굳이 순서에 대해서 보는 이유는 행렬 곱이 교환 법칙이 안 돼서라는 것을 짐작하셨을 것 같습니다ㅎㅎ

&emsp;일단 주 참고자료 기준으로는 공간 변환을 한 공간에서 또 다른 공간으로 정점을 변환하는 걸 말한다고 하네요.

#### 감잡기?

&emsp;이런 의문이 드시는 분도 계실 것 같습니다.

> "여태껏 변환이라고 했던 일들이 우리가 원하는 위치에 원하는 회전 방향 등등으로 배치하는 일인데 왜 '공간' 변환이라고 하는 거지?"

다시 말하면, 고정된 좌표계가 있고 물체만 요리조리 바꾸는 것이라는 관점이겠죠. 네 이것도 충분히 좋은 생각이고 실제로는 이렇게만 생각하고 적용하셔도 웬만하면 크게 문제는 없을 것 같다고 생각합니다. <br>
&emsp;그런데 여기서, 물체에는 아무런 변화가 없고 물체가 속해 있는 공간 자체가 변화했다는 관점으로 생각하면 어떨까요?

![공간 변환 예시 그림](/assets/images/2024-05-09-D3D11_DrawCubeAnd3DSpace_images/SpaceTransformExample.jpg)

위와 같은 물체와 공간이 있다고 해봅시다. 

![오른쪽으로 이동 변환 예시 그림](/assets/images/2024-05-09-D3D11_DrawCubeAnd3DSpace_images/SpaceTransformExample2.jpg)

마우스로 덧 그린거라 저퀄 죄송...ㅋㅋㅋㅋ

이와 같이 물체를 오른쪽으로 이동시킨다고 했을 때, 1번처럼 '물체'가 이동했다고 볼 수도 있지만 2번처럼 물체가 속한 '공간'이 왼쪽으로 이동했다고도 볼 수 있습니다. 이렇듯, 물체가 속한 공간 좌표계를 일종의 왜곡 시켜서 우리가 원하는 좌표계에 맞춘다는 관점에서 공간 변환이라고 이해하시면 될 것 같습니다. 

&emsp;이게 엄밀한 설명이 아닐수도 틀린 설명일 수 있지만요. 자세한 건 그래픽스 이론 보면서 다시 정리하시길!

#### 변환 순서

&emsp;변환을 할 때 행렬 연산을 사용하기 때문에 순서가 중요합니다. 따라서, 순서에 대해서 한 번 볼 것이고 하면서 겸사겸사 각 순서에서 하는 일에 대해서 간단하게 정리해보겠습니다.

&emsp;본격적으로 들어가기 앞서 주 참고자료 기준 3D 컴퓨터 그래픽스 파이프라인에는 논리적으로 세 가지 변환이 있다고 합니다. 월드, 뷰, 투영 변환이 이에 해당입니다. 그리고 각 변환에서는 이동, 회전, 스케일링 연산을 할 수도 있습니다.

##### 1. 월드 변환

- 물체 공간의 정점들을 월드 공간의 정점들로 변환하는 것
- 장면 속 각 물체는 자신만의 월드 변환 행렬을 가짐
  - 물체에 주고자하는 크기, 방향, 위치에 기반하여 결정

##### 2. 뷰 변환

- 관찰자 시점에서의 공간으로 변환하는 것
- 뷰 행렬은 카메라에 대해서 반대 변환이 필요함
  - 감잡기에서 봤던 관점으로 생각하면 쉽습니다.
  - 카메라가 오른쪽으로 이동하는 것 = 물체가 왼쪽으로 이동하는 것
- `XMMatrixLookAt` 함수 사용

##### 3. 투영 변환

- 월드 공간, 뷰 공간 같은 3D 공간을 투영 공간으로 정점 변환하는 것
- X / Z, Y / Z 같은 정점들의 비에 의해서 X, Y가 결정됨
- 변환을 하고나면 절두체(View frustum)가 박스 모양이 됨
- `XMMatrixPerspectiveFov` 함수 사용

## 코드 살펴보기2

### 단계별 접근

&emsp;그럼 염두해둘 것은 본 거 같으니 다시 해봅시다!

#### 상수 버퍼 추가 정의

~~~ C++
typedef struct
{
	XMMATRIX world;
	XMMATRIX view;
	XMMATRIX projection;

	XMMATRIX transfrom; // 정점 변환용 변수
} constant_buffer_t;
~~~

&emsp;열심히 살펴본 공간 변환행렬을 정의하고 적용해야 하니 이렇게 추가로 정의해줍시다. <br>
&emsp;여담으로 이전 게시글에서도 나왔지만 경우에 따라선 이렇게 합치는 게 아니라 분리해서 각각 따로 리소스 생성하는 게 더 좋습니다!

~~~ C++
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
		0.1f, // 절두체 근평면의 위치
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
~~~

&emsp;초기화를 해주고 파이프라인에 알려줄 준비를 합시다. 여기서 월드 변환 행렬을 보면 단위 행렬을 그대로 사용하고 있는데, 정의한 정점 자체가 월드 공간이라고 의도했기 때문입니다. 필요에 따라서 적절한 행렬 초기화가 필요할 수 있습니다. <br>
&emsp;변환행렬에서 추가적으로 뭘 할 예정은 없기 때문에 미리 전치시켜서 전송했습니다. 추가적으로 행렬은 CPU의 여유가 된다면 미리 합쳐서 전송하는 것도 총 연산량이 줄어서 좋은 방법이 될 수도 있을 것 같습니다.

##### 절두체(View Frustum) 관련

![절두체 이미지](/assets/images/2024-05-09-D3D11_DrawCubeAnd3DSpace_images/ViewFrustum.png)

&emsp;일단 절두체라는 건 위 이미지처럼 생긴 입체도형을 말합니다. 이 입체도형은 화각 용도로 사용하게 되는데, 도형 안에 들어오면 그리고 들어오지 않으면 빼버리고 하는 식으로 말이죠. 이런 방식으로 절두체에서 벗어난 정점들을 제외시키는 걸 절두체 컬링(culling)이라고 합니다.

![절두체 측면도](/assets/images/2024-05-09-D3D11_DrawCubeAnd3DSpace_images/SideViewOfViewFrustum.png)

&emsp;이론적인 걸 다루진 않을 거라 그냥 직관적으로 받아들이면 되지만 fovY는 살짝 아리송할 수도 있어서 넣어봤습니다. 이미지 같이 위아래의 시야각이라고 생각하시면 될 것 같습니다.

#### 그리기 코드 변경

~~~ C++
// 회전 행렬용 정적 각도 값
const float DELTA_THETA = XM_PI / 36;
static float theta = 0;

theta += DELTA_THETA;
// 다음 변환 가중치 계산
sConstantBuffer.transfrom = XMMatrixRotationY(theta);

// HLSL 계산 방식으로 인한 전치
sConstantBuffer.transfrom = XMMatrixTranspose(sConstantBuffer.transfrom);

// 바인딩한 리소스 업데이트
spDeviceContext->UpdateSubresource(
	spConstantBuffer, // 업데이트할 서브리소스 포인터
	0, // 업데이트할 서브리소스 번호
	nullptr, // 서브리소스 선택 박스 포인터
	&sConstantBuffer, // 업데이트에 사용할 데이터
	0, // 다음 행까지의 시스템 메모리 바이트 수
	0 // 다음 깊이까지의 시스템 메모리 바이트 수
);
~~~

&emsp;3차원 물체를 위쪽에서 볼 예정이라 y축 회전이 더 재밌을 것 같아서 살짝 변경해줬습니다. 또한 상수 버퍼에 내용들이 더 붙었으니 그에 맞게 코드도 변경됐습니다. <br>
&emsp;회전 행렬 관리하는 방법이 바뀌었는데, 계속 전치하고 곱하고 대입하고 여차저차 하다보니 실수가 쉽게 나와서 정적 변수 관리하는 방식으로 변경했습니다.

#### 쉐이더 코드 변경

&emsp;정점 데이터 및 상수 버퍼 같이 GPU 프로그램에서도 반영돼야 하는 변경사항들이 있으니 바꿔줍시다.

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
    float4 color : COLOR;
};

typedef VS_OUTPUT PS_INPUT;
~~~

&emsp;우선 상수 버퍼 레이아웃에 맞게 행렬들을 헤더에 선언해줍시다. 그 외에는 변경된 정점 데이터에 맞게 구조체를 잡아주고 typedef로 별칭을 설정해주었습니다. <br>
&emsp;별칭 문법을 보면 C랑 같죠? 이런 요소가 많아서 제가 HLSL에 관한 내용들은 거의 적진 않았는데, 그래도 간단한 쉐이더 책은 한 번쯤은 보는 것도 나쁘진 않을 것 같네요.

##### VertexShader.hlsl

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

&emsp;정점 쉐이더에서 회전 변환 및 공간 변환을 수행해줍니다. 저는 미리 행렬을 합쳐서 계산했지만 그냥 다 따로 하시는 경우도 많았던 거 같습니다. <br>
&emsp;연산할 때 주의할 점이 있다면 *(요소별 곱하기 SIMD)연산이랑 mul(행렬 * 행렬)의 결과가 다르니 주의하세요!

##### PixelShader.hlsl

~~~ HLSL
#include "ShaderHeader.hlsli"

float4 main(PS_INPUT input) : SV_TARGET
{
    return input.color;
}
~~~

&emsp;단순하게 들어온 색상만 넘겨줍니다. 간단하죠?ㅋㅋ 이렇게 하면 [결과](#결과)와 같이 알록달록한 3차원 물체를 볼 수 있습니다!

## 소스코드 깃 주소

[DrawCube](https://github.com/redbindy/DX11ForPost/tree/master/DrawCube)

## 참고자료 및 출처
- [DirectX-SDK-Samples](https://github.com/walbourn/directx-sdk-samples)
- [MSDN - 3-D Coordinate Systems](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/bb324490%28v=vs.85%29)
- [AlgeoMath](https://www.algeomath.kr/algeo/algeomath/poly/make.do)
- "OpenGL ES를 이용한 3차원 컴퓨터 그래픽스 입문", 한정현, 도서출판 홍릉, 2019.05.31, p.29 ~ p.30
- [MSDN - XMMatrixLookAtLH 함수(directxmath.h)](https://learn.microsoft.com/ko-kr/windows/win32/api/directxmath/nf-directxmath-xmmatrixlookatlh)
- [MSDN - XMMatrixPerspectiveFovLH function (directxmath.h)](https://learn.microsoft.com/en-us/windows/win32/api/directxmath/nf-directxmath-xmmatrixperspectivefovlh)
- [LearnOpenGL - Frustum Culling](https://learnopengl.com/Guest-Articles/2021/Scene/Frustum-Culling)
- [MSDN - DirectX Factor : The Canvas and the Camera](https://learn.microsoft.com/en-us/archive/msdn-magazine/2014/june/directx-factor-the-canvas-and-the-camera)
- [MSDN - User-Defined Type](https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-user-defined)
- [MSDN - 구성 요소별 수학 연산](https://learn.microsoft.com/ko-kr/windows/win32/direct3dhlsl/dx-graphics-hlsl-per-component-math)