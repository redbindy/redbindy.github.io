---
layout: post
title: "DirectX11 튜토리얼 정리2: 삼각형 그리기"
category: 컴퓨터공학
tags: [C/C++, DX11, DirectX11]
---

## 이전 게시글

&emsp;이전 게시글에서 내용과 코드가 이어집니다. 안 보고 오셨다면

### [DirectX11 튜토리얼 정리1: 화면 지우기](/컴퓨터공학/2024/03/20/DX11_ClearScreen.html)

&emsp;먼저 보시는 것도 추천!

## 결과

![결과 이미지](/assets/images/2024-03-29-DX11_DrawTriangle_images/result.JPG)

&emsp;이렇게 간단한 삼각형을 그리는 코드를 작성해볼 예정입니다. 삼각형을 그릴 때 두 가지 버전의 코드로 작성을 해볼 건데 실제로는 두 번째 버전만 사용한다고 보셔도 좋을 것 같습니다!

## 이번 게시글에서 사용할 전체 코드

**Jekyll 버그인지 코드 부분 부분에서 넣지도 않은 \가 출력되고 있네요. 참고해주십쇼!**

### C++

#### 첫 번째 버전: 정점 버퍼만 사용하여 그리기

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

// 사용할 정점 구조체
// 위치 정보 외에도 다양한 데이터가 추가될 수 있음
typedef struct
{
	DirectX::XMFLOAT3 pos; // 단순 (x, y, z)를 표현하기 위해 float3 사용
} vertex_t;

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
static ID3D11VertexShader* spVertexShader;
static ID3D11PixelShader* spPixelShader;
static ID3D11Buffer* spVertexBuffer;

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
		nullptr, // 쉐이더 컴파일러가 include 파일 처리에 사용하는 인터페이스 포인터
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
		nullptr, // 쉐이더 컴파일러가 include 파일 처리에 사용하는 인터페이스 포인터
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
}

void DestroyD3D11()
{
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

	// 정점 그리기
	spDeviceContext->Draw(
		3, // 정점의 수
		0 // 시작 오프셋
	);

	spSwapChain->Present(
		1, // 동기화에 사용할 시간
		0 // 프레임 표현 옵션
	);
}
~~~

#### 두 번째 버전: 인덱스 버퍼 사용하여 그리기

&emsp;바뀐 것만 작성하겠습니다~

~~~ C++
void InitializeD3D11()
{
	// 동일 코드 생략

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
}

void DestroyD3D11()
{
	if (spIndexBuffer != nullptr)
	{
		spIndexBuffer->Release();
		spIndexBuffer = nullptr;
	}

	// 동일 코드 생략
}


void Render()
{
	// 동일 코드 생략

	spDeviceContext->DrawIndexed(
		3, // 그릴 인덱스의 수
		0, // 첫 인덱스를 읽을 위치
		0 // 정점 버퍼로부터 정점을 읽기 전에 각 인덱스에 더할 값
	);

	// 동일 코드 생략
}
~~~

### HLSL

&emsp;여기는 똑같아서 뭉탱이 쳐서 올립니다ㅋㅋ

#### VertexShader.hlsl

~~~ HLSL
float4 main(float4 pos : POSITION) : SV_POSITION
{
    return pos;
}
~~~

#### PixelShader.hlsl

~~~ HLSL
float4 main() : SV_TARGET
{
    return float4(1.0f, 1.0f, 1.0f, 1.0f);
}
~~~

## 코드 살펴보기(정점 버퍼만 사용)

&emsp;이번 코드 살펴보기부터는 바뀐 것만 보겠습니다. 참고해주세요~

### 사용할 라이브러리 및 컴파일러 옵션

~~~ C++
#include <DirectXMath.h>
#include <d3dcompiler.h>

#pragma comment(lib, "d3dcompiler.lib")
~~~

&emsp;추가된 헤더와 라이브러리 링크입니다. <br>
&emsp;저번 게시글처럼 추가적인 내용은 달지 않겠습니다. 제가 특이해서 그럴지도 모르겠지만 필요한 함수를 찾고 그 이후에 필요한 헤더, dll 등을 보는 편이라서요ㅋㅋ

### 윈도우 관련 코드

&emsp;바뀐 게 없으니 생략!

### DirectX11

&emsp;이번 챕터의 큰 흐름은 다음과 같습니다.

1. 정점 구조체 선언
2. 튜토리얼1과 동일한 과정
3. 필요한 추가 개체 포인터 선언
4. 사용할 쉐이더 컴파일 및 리소스 생성
5. 정점 레이아웃 배열 생성
6. 레이아웃 리소스 생성 및 레이아웃 설정
7. 정점 데이터 정의
8. 정점 버퍼 리소스 생성 및 설정
9.  삼각형 그리기 모드 설정
10. 렌더링

#### 정점 구조체 선언

~~~ C++
// 사용할 정점 구조체
// 위치 정보 외에도 다양한 데이터가 추가될 수 있음
typedef struct
{
	DirectX::XMFLOAT3 pos; // 단순 (x, y, z)를 표현하기 위해 float3 사용
} vertex_t;
~~~

&emsp;사용할 정점에 대한 정보를 구조체로 선언해줍니다. 이번 게시글에서는 단순 좌표 정도만 넣어놨는데 색상, 법선벡터 등등 훨씬 다양한 정보를 넣어서 사용합니다.

#### 필요한 추가 개체 포인터 선언

~~~ C++
// VertexShader: 정점 쉐이더 리소스 인터페이스
// PixelShader: 픽셀 쉐이더 리소스 인터페이스
// VertexBuffer: 정점 버퍼 리소스 인터페이스
static ID3D11VertexShader* spVertexShader;
static ID3D11PixelShader* spPixelShader;
static ID3D11Buffer* spVertexBuffer;
~~~

&emsp;요것들을 추가로 선언합니다. 이외에도 더 있긴한데 유지하면서 쓸 것들은 요정도면 될 것 같네요. 사실 현재 튜토리얼에선 수준에선 굳이 유지할 필요도 없을 순 있습니다ㅋㅋ

#### 사용할 쉐이더 컴파일 및 리소스 생성

~~~ C++
// 쉐이더, 컴파일 오류를 받을 이진 개체
ID3DBlob* pVertexShaderBlob = nullptr;
ID3DBlob* pPixelShaderBlob = nullptr;
ID3DBlob* pErrorBlob = nullptr;

// 정점 쉐이더 컴파일
hr = D3DCompileFromFile(
	TEXT("VertexShader.hlsl"), // 쉐이더 코드 파일 이름
	nullptr, // 쉐이더 매크로를 정의하는 구조체 포인터
	nullptr, // 쉐이더 컴파일러가 include 파일 처리에 사용하는 인터페이스 포인터
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
	nullptr, // 쉐이더 컴파일러가 include 파일 처리에 사용하는 인터페이스 포인터
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
~~~

&emsp;HLSL 기반 쉐이더를 컴파일합니다. 여러 가지 방법이 있을 수 있는데 이번 시리즈에선 위와 같은 방식으로 컴파일하는 걸로 하겠습니다. 기억해둬야할 게 있다면 바로 컴파일해서 리소스로 만드는 게 아니라 `ID3DBlob`를 한 번 거쳐서 사용하게 됩니다.

&emsp;`D3DCompileFromFile()` 문서를 보면 스토어 게시용 앱을 만든다면 사용 못하는 함수라고 하네요. 그외에도 기타 필요하신 정보는 문서를 보시면서 하면 충분히 하실 수 있으실 겁니다!

##### ID3DBlob

&emsp;별 건 아니고 바이트 덩어리를 캡슐화해서 다양한 용도의 버퍼로 사용될 수 있는 인터페이스 정도로 생각하시면 될 것 같습니다.

#### 정점 레이아웃 배열 생성

~~~ C++
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
~~~

&emsp;GPU에게 앞서 선언한 정점 구조체가 가지고 있는 데이터의 자료형, 용도, 시작 위치 등등을 알려주는 단계라고 보셔도 좋을 것 같습니다. 보통 더 여러가지 정보를 정점에 넣어두기 때문에

~~~ C++
D3D11_INPUT_ELEMENT_DESC layoutArr[] = {
    { "POSITION", 0, DXGI_FORMAT_R32G32B32_FLOAT, 0, 0, D3D11_INPUT_PER_VERTEX_DATA, 0 }, 
    // 멤버에 대한 DESC의 값들
};
~~~

이런 방식으로 많이 사용하는 것 같더군요.

##### 슬롯 번호

&emsp;문서에서는 파이프라인 단계 중에서 IA(Input-Assembler)단계에서 여러 입력 슬롯을 가지고 있고 그게 여러 버퍼를 수용하기 위해 설계된 장소라고 말하고 있는데 단순하게 생각하면 버퍼가 위치한 배열의 색인쯤으로 볼 수 있을 것 같습니다.

##### 인스턴싱

&emsp;정확하게 이해한 건 아닌 것 같아서 나중에 써봐야 확실해질 것 같지만 지금까지의 제 이해로는 그릴 걸 전송해놓고 한 번의 그리기 호출만으로 여기저기 그리는 방법을 쓸 때 쓰는 것 같네요.

#### 레이아웃 리소스 생성 및 레이아웃 설정

~~~ C++
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
~~~ 

&emsp;앞서 열심히 만들어뒀던 정점 DESC 배열을 갖고 리소스로 만들어줍니다. 이후 `IASetInputLayout()`를 통해서 만들어진 입력 데이터 정보를 파이프라인 IA 단계에 설정해줍니다

&emsp;추가적으로 더 이상 사용 안 할 개체는 정리해줬습니다.

&emsp;슬슬 초기화 대부분 단계들이

1. 파이프라인에 넘길 정보 생성 
   - 필요에 따라 Device로 리소스 생성
2. DeviceContext로 파이프라인에 바인딩

요런 느낌이라는 게 감이 오는군요. 파이프라인의 각 단계가 어떻고 뭘 필요로 하는지 간단하게 정리할 때가 된 것 같습니다. 해당 내용들은 [Direct3D 11 그래픽 파이프라인](#direct3d-11-그래픽-파이프라인)에 정리하겠습니다!

#### 정점 데이터 정의

~~~ C++
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
~~~

&emsp;정점을 정의하는 부분입니다. 역시나 바로 사용은 못하고 DESC 구조체랑 DATA 구조체를 따로 만들어서 써야하네요. <br>
&emsp;튜토리얼이라 직접 배열에 정의해서 사용하고 있는데 실제 응용프로그램에서는 모델링 프로그램에서 읽어온 정점들을 전달하게 될 것 같습니다.

#### 정점 버퍼 리소스 생성 및 설정

~~~ C++
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
~~~

&emsp;아까 만들어둔 구조체들을 활용해서 버퍼 리소스를 만들어주고 `IASetVertexBuffers()`를 통해서 본격적으로 파이프라인에 데이터를 집어 넣습니다. 이번 튜토리얼에서는 하나 밖에 안 들어가서 군더더기가 생긴 코드지만 실제 여러 데이터가 들어가면 포인터로 넘기는 게 당위가 생길 것 같습니다.

#### 삼각형 그리기 모드 설정

~~~ C++
// 삼각형 그리는 방법 설정
spDeviceContext->IASetPrimitiveTopology(D3D11_PRIMITIVE_TOPOLOGY_TRIANGLELIST);
~~~

&emsp;정점이 주어졌을 때 어떤 방식으로 도형을 그릴지 결정하는 부분입니다. 주석에는 삼각형만 그릴거라 삼각형 그리기 방법이라 했는데 꼭 삼각형만 되는 건 아닙니다ㅋㅋ 노파심에 언급!

![위상 방법](/assets/images/2024-03-29-DX11_DrawTriangle_images/topology_method.png)

위와 같은 도형이 있다고 할 때, 예제에서 설정한 방식을 선택해서 왼쪽 도형을 그린다면

> A B C B D C

이런 방식으로 삼각형이 그려지게 됩니다(정점 순서는 꼭 이렇게 안 될 수도 있습니다!). 그런데 B랑 C가 두 번씩 나오면서 낭비되는 느낌이 들어서 불-편함을 느끼시는 분도 계실 것 같습니다. 그럴 때 Triangle Strip 같은 방법으로 설정을 해준다면 

> A B C D

와 같이 정점을 그리기를 줄일 수 있습니다. 따라서 어떤 물체를 어떻게 렌더링할지 상세하게 설정할 때 아주 중요한 역할을 한다고 볼 수 있습니다. 점, 선 등 다앙한 모드가 있으니 상황에 따라 그때 그때 잘 설정해야겠네요.

#### 잊지 말 것

~~~ C++
void DestroyD3D11()
{
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

	// 동일한 이전 코드 생략
}
~~~

&emsp;포인터 해제하는 거 항상 잊지 말고 해줍시다ㅋㅋ

#### 렌더링

~~~ C++
void Render()
{
	// 이전과 동일한 코드 생략

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

	// 정점 그리기
	spDeviceContext->Draw(
		3, // 정점의 수
		0 // 시작 오프셋
	);

	spSwapChain->Present(
		1, // 동기화에 사용할 시간
		0 // 프레임 표현 옵션
	);
}
~~~

&emsp;만들어뒀던 쉐이더 리소스를 설정하고 `Draw()`를 통해서 전송해둔 정점 버퍼를 렌더링 대상에게 그려주고 `present()`를 호출하면 끝입니다.

&emsp;쉐이더를 렌더링에서 굳이 설정해주는 이유는 렌더링할 때마다 사용하는 쉐이더를 달리 설정할 수 있을 것 같아서 했습니다...만 저는 아직 공부하는 학생이라 실제로 사용하는 방법인지는 잘 모르겠습니다ㅋㅋ

### HLSL

&emsp;정점에 딱히 복잡한 정보를 넣지는 않아서 그냥 비주얼 스튜디오로 자동 생성되는 거 그대로 냅뒀습니다. 그래서 설명할 게 없네요ㅋㅋ

## 코드 살펴보기(인덱스 버퍼 사용)

&emsp;앞서 정점에 많은 데이터를 넣어서 사용한다고 했습니다. 그런데 앞 방식을 그대로 사용할 경우 정점이 많아지게 되면 삼각형을 그리는 방법이나 순서가 명백하지 않을 수 있고 중복 정점이 있을 경우 데이터 전송에 따른 부담도 커집니다(그래픽스 프로그래밍에서 흔한 병목 지점 중 하나가 데이터 전송이기도 합니다.). 이외에도 여러 이점을 취할 수 있기 때문에, 정점 버퍼의 인덱스 값을 그릴 순서대로 저장해두고 전송하여 삼각형을 그려달라고 요청하는 인덱스 버퍼 방식을 일반적으로 사용하게 됩니다.

### 사용할 라이브러리 및 컴파일러 옵션

&emsp;전 내용과 동일

### 윈도우 관련 코드

&emsp;전 내용과 동일

### DirectX11

&emsp;거의 같습니다. 

&emsp;여담으로 제가 계속 덧붙여나가는 방식으로 코드를 작성하고 있어서 그렇지 꼭 이 순서로 초기화하고 사용하실 필요는 없습니다ㅋㅋ

1. 정점 구조체 선언
2. 튜토리얼1과 동일한 과정
3. 필요한 추가 개체 포인터 선언
4. 사용할 쉐이더 컴파일 및 리소스 생성
5. 정점 레이아웃 배열 생성
6. 레이아웃 리소스 생성 및 레이아웃 설정
7. 정점 데이터 정의
8. 정점 버퍼 리소스 생성 및 설정
9.  삼각형 그리기 모드 설정
10. 인덱스 데이터 정의
11. 인덱스 버퍼 리소스 생성 및 설정
12. 렌더링

#### 필요한 추가 개체 포인터 선언

~~~ C++
// IndexBuffer: 인덱스 버퍼 리소스 인터페이스
// 동일 코드 생략
static ID3D11Buffer* spIndexBuffer;
~~~

&emsp;인덱스 버퍼 리소스를 쓸 거니 하나 만들어줍시다.

#### 인덱스 데이터 정의

~~~ C++
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
~~~

&emsp;인덱스 데이터를 정의하는 부분입니다. 방식은 거의 동일합니다. <br>
&emsp;데이터 정의할 때 막 넣어놨는데 향후 3D 도형을 그리거나 할 때 정점 정의 순서도 중요한 부분입니다. 그러나 그건 다음에 봅시다!

#### 인덱스 버퍼 리소스 생성 및 설정

~~~ C++
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
~~~

&emsp;인덱스 버퍼 리소스를 생성 하고 설정하는 부분입니다. 역시 비슷합니다. 다만, 인덱스 버퍼 형식을 정의할 때는 `DXGI_FORMAT_R16_UINT`랑 `DXGI_FORMAT_R32_UINT`만 허용한다고 하네요.

#### 이번에도 마찬가지로

~~~ C++
void DestroyD3D11()
{
	if (spIndexBuffer != nullptr)
	{
		spIndexBuffer->Release();
		spIndexBuffer = nullptr;
	}

	// 동일 코드 생략
}
~~~

&emsp;초기화 했으면 해제부터 작성하는 습관!(사실 저도 잘 안 지켜질 때 많은 듯 합니다ㅋㅋ)

#### 렌더링

~~~ C++
void Render()
{
	// 동일 코드 생략

	spDeviceContext->DrawIndexed(
		3, // 그릴 인덱스의 수
		0, // 첫 인덱스를 읽을 위치
		0 // 정점 버퍼로부터 정점을 읽기 전에 각 인덱스에 더할 값
	);

	// 동일 코드 생략
}
~~~

&emsp;그냥 함수만 `DrawIndexed()`로 바꿔준 게 끝입니다. 이러면 이 부분은 끝!

### HLSL

&emsp;전 내용과 동일

## 쉐이더란?

&emsp;계속 쉐이더 쉐이더 얘기는 했는데 짚고 넘어가지는 않아서 한 번 짚어봅니다ㅋㅋ

- 각기 다른 그래픽스 파이프라인 단계에 있으면서 GPU에 의해서 실행되는 짧은 프로그램
  - 제가 주 참고자료로 쓰고 있는 SDK 튜토리얼 설명입니다.
- 3D 장면을 렌더링하는 동안 명암 색상 등의 적절한 수준(level)을 계산해주는 컴퓨터 프로그램
  - 영문 위키에서 가장 먼저 나오는 전통적 정의는 대충 이렇네요

&emsp;일단 고전적인 그래픽 처리 장치 관점에서는 이렇게 될 거 같네요. 그런데 DX11부터는 컴퓨트 쉐이더 같이 조금 더 범용적인 계산을 위한 쉐이더도 나오면서 그냥 GPU보고 돌려달라고 요청하는 프로그램 정도로 정리할 수 있지 않을까 싶습니다.

### 쉐이더 vs 셰이더

&emsp;작성하는 분들마다 쉐이더, 셰이더 이런 식으로 적어주시는데 전 일단 쉐이더로 통일하기로 했습니다.

## Direct3D 11 그래픽 파이프라인

![D3D11 그래픽 파이프라인](/assets/images/2024-03-29-DX11_DrawTriangle_images/d3d11_pipeline_stages.JPG)

&emsp;Direct3D 11 그래픽 파이프라인은 위와 같습니다. 이 단계들 중에서 Vertex Shader, Pixel Shader는 필수이고(인데 보다보니 픽셀 쉐이더는 끌 수 있나보네요. 요건 SDK 튜토리얼 설명 기준이었습니다.) 나머지는 선택적으로 적용하는 거라고 하네요. 어쨌거나 이제 하나씩 살펴봅시다.

### 단계별 간단 요약

&emsp;아래 정리는 쓸데없이 내용 많이 적은 것도 있어서 당장은 간단하게 이 정도만 보셔도 될 수도 있습니다!

1. Input-assembler stage
   - 사용자 입력을 향후 사용할 primitive(점, 선, 삼각형)로 합성
   - 합성에 필요한 정보 필요
2. Vertex shader stage
   - 정점들에 대한 변환, 스키닝(피부 씌우기), 모핑(형체 변형), 라이팅 처리
   - 필수적으로 만들어야 하는 쉐이더 
3. Tessellation stages
   - 업스케일링 비스무리한 걸 하는 단계
   1. Hull shader stage: patch 단위로 이후 단계에서 쓸 데이터 생산
   2. Tessellator stage: 샘플링 패턴, 더 작은 개체 집합(삼각형, 점, 선) 생성
   3. Domain shader stage: 각 샘플에 대응되는 정점의 위치를 계산함
4. Geometry Shader stage
   - primitive 단위로 정점에 대한 연산
5. Stream Output stage
   - 기하 쉐이더 출력을 시스템 메모리로 출력하는 단계
6. Rasterizer stage
   - 벡터 정보를 레스터 이미지 즉, 2D 공간에 맞게 변환하는 단계
7. Pixel-shader stage(= Fragment Shader)
   - 레스터라이저에 의해 생성된 데이터로 라이팅, 후처리과 같은 쉐이딩 기술을 구현하는 단계
   - 각 픽셀값을 결정
8. Output-merger stage
   - 화면에 뿌려질 최종 색상값을 결정함

&emsp;여담으로 픽셀 쉐이더란 말은 엄밀하게 말하면 틀렸고 fragment라고 해야 맞다고 하네요.

### Input-assembler Stage

- 파이프라인의 첫 단계
- 유저가 채워넣은 버퍼 데이터들을 읽고 다른 파이프라인 단계에서 사용할 primitives로 합성하는 게 목적
	- 이 단계를 통해서 정점들을 primitive로 합성할 수 있음
- 다른 파이프라인에 필요한 정보를 출력하게 하려면 입력 레이아웃에 포함해서 설정해줘야함
- 쉐이더를 더 효율적으로 만드는 것을 돕기 위해서 system-generated values를 첨부하기도 함
  - system-generated values는 semantics라 부르는 문자열을 말함
- Vertex shader stage의 입력으로 쓰일 출력을 만들어냄
  - 메모리에서 데이터를 primitive로 합성하고 system-generated values를 붙여서 출력

&emsp;이외에도 더 많은 내용들이 있긴한데 당장 필요하진 않을 것 같기도 해서 요정도만 보겠습니다ㅋㅋ

#### 사용 단계

1. 입력 버퍼 생성
2. 입력 레이아웃 개체 생성
3. IA 단계에 개체를 바인딩
4. Primitve 유형을 명시
5. Draw 호출

### Vertex-Shader(VS) Stage

- IA단계로부터 온 정점들에 대해서 변환, 스키닝(피부 씌우기), 모핑(형체 변형), 라이팅과 같은 연산을 처리하는 단계
  - 항상 한 개의 정점을 입출력으로 처리함
- 파이프라인에서 필수적이므로 반드시 만들어서 설정해둬야 함
  - 아무 것도 안 할거라면 그냥 입력을 출력으로 빼면 됨
- 각 정점 쉐이더의 입력, 출력 정점은 32비트 4요소 벡터로 최대 16까지 구성될 수 있음
- 최소 한 개의 입력과 한 개의 출력을 가짐
  - 스칼라 값이어도 상관 없다고 함
- 그리기 모드와 상관없이 언제나 모든 정점에 대해서 수행됨
- 수행된 횟수는 VSInvocations pipeline statistic을 사용해서 CPU로부터 조사될 수 있음
- 텍스쳐 로딩과 샘플링 연산도 가능함

&emsp;거의 모든 내용을 담은 것 같아서 정리가 아닌 것 같네요ㅋㅋ 빠진 내용도 있긴한데 당장 알 필요는 없을듯 합니다.

### Tessellation Stages

- GPU에서 낮은 디테일의 subdivision surface를 높은 디테일의 primitives로 변환해주는 역할을 함
  - 테셀레이션 자체는 평면을 동일한 모양을 이용해서 빈틈, 겹치는 부분 없이 채우는 걸 뜻하는 용어 같네요.
  - 하드웨어에서 테셀레이션을 구현함으로써 낮은 디테일(폴리곤 수가 적은) 모델을 계산해서 높은 디테일로 렌더링 할 수 있음
- 다음과 같은 이점이 있다고 함
  - 저해상도 모델 전송으로 인한 메모리 및 대역폭 절약
  - 즉시 계산될 수 있는 연속, 뷰 종속 세부 수준 같은 확장가능한 렌더링 기술 지원
  - 낮은 디테일 모델에서 계산함으로써 비싼 연산에 대한 성능 향상

&emsp;아무튼 이것 때문에 세 개의 파이프라인 단계가 생겼다고 합니다. 자세한 건 사용할 때 보고 간단하게만 보고 가겠습니다.

#### Hull-Shader Stage

- 각 입력 패치(input patch -> quad(사각형?), 삼각형, 선이라고 함)에 대응되는 기하 패치(geometry patch), 패치 상수(patch constants)를 생산할 수 있는 프로그래밍 가능한 쉐이더 단계

&emsp;이것만 봐서는 잘모르겠네요. 그런데 일단 patch라는 게 대충 Hull 쉐이더 단계에서의 입력 단위인 것 같은 느낌?

#### Tessellator Stage

- 기하 패치를 표현하는 영역의 샘플링 패턴을 생성(creates)하고 이러한 샘플들을 연결하는 더 작은 개체들의 집합(삼각형, 점, 선)을 만들어내는(generates) 고정된 파이프라인 단계
- Hull-Shader 단계를 파이프라인에 바인딩함으로써 초기화됨
- 영역(domain -> quad, tri, or line)을 많은 수의 더 작은 개체(삼각형들, 점들, 선들)로 작게 나누는 것(subdivide)이 목적
- 정규화된 좌표([0, 1])에서 표준 영역(canonical domain) 타일을 뽑아냄

#### Domain-shader stage

- 각 영역 샘플(domain sample)에 대응되는 정점의 위치를 계산하는 프로그래밍 가능한 쉐이더 단계
  - 출력 패치에서 작게 나눠진 점들의 정점 위치를 계산
- 테셀레이터 단계 출력점 하나당 한 번씩 작동하고 테셀레이터 단계 출력 UV 좌표, hull 쉐이더 출력 패치, hull 쉐이더 패치 상수들에 대해서 읽기전용 접근권을 가짐

### Geometry Shader(GS) Stage

- 정점들을 입출력으로 사용하는 특화된 쉐이더 코드를 돌리는 단계
  - 정점 한 개씩 연산하는 정점 쉐이더랑 달리 완전한 primitive를 단위로 사용함
  - 정점 두 개의 선, 정점 세 개의 삼각형 등등
- 출력은 stream output stage를 거쳐서 레스터라이저 단계, 메모리에 있는 정점 버퍼로 전달될 수 있음
  - 메모리에 출력될 때는 점/선/삼각형 리스트로 확장되는데 레스터라이저에 전달되는 것과 정확히 동일함
- primitive 단위로 한 번씩 호출됨
  - 가령 triangle strip이어도 각 삼각형마다 수행
- 출력 스트림 개체에 한 번에 정점 하나씩을 덧붙여서 출력을 하는데 스트림의 위상(topology)은 PointStrea, LineStream, TriangleStream으로 고정 선언을 하면서 결정됨
- 기하 쉐이더 인스턴스의 실행은 스트림에 추가된 데이터가 직렬이라는 점을 제외하면 다른 호출로부터 원자적임
  - 정확하게 무슨 의미인지 잘 모르겠네요ㅋㅋ
- 출력은 System Interpreted Value(예시: SV_RenderTargetArrayIndex or SV_Position)에 의해서 식별됨
- 불완전한 primitive가 생성될 수 있는데 이것들은 버려짐
  - IA 단계와 비슷한 방식
- 텍스쳐를 로딩하고 샘플링할 수 있음

&emsp;SDK 튜토리얼을 보면 요것까지 기본 쉐이더라고 하네요. 대신 필수는 아니라고 합니다. <br>
&emsp;문서에서 구현될 수 있는 알고리듬들도 소개가 되고 있지만 일단 패스!

### Stream-Output Stage

- 기하 쉐이더(없는 경우 정점 쉐이더) 단계로부터 온 데이터를 하나 이상의 버퍼들에 연속적으로 출력(혹은 스트림)하는 것이 목적인 단계
  - 시스템 메모리로 출력하는 것으로 도로 사용 가능하고 CPU가 읽을 수도 있고 등등
- strip은 리스트로 변환돼서 출력되는데 항상 완전한 primitive만 작성됨
- D3D11_BIND_STREAM_OUTPUT 플래그를 설정하고 버퍼를 만들어 사용 가능하고 stream-output stage에서 동시에 4개까지 지원함

&emsp;스트림 출력으로 사용하는 버퍼의 특징, 사용법도 있긴한데 필요할 때 찾아서 보는 걸로 하려고 합니다ㅋㅋ

### Rasterizer Stage

- 벡터 정보(모양, primitives로 구성)를 레스터 이미지(픽셀들로 구성)로 변환하는 단계
  - 실시간 3D 그래픽스를 보여주기 위한 용도
- 각 primitive의 정점별 값들을 보간(interpolating)하므로써 primitive가 픽셀들로 변환됨
- 절두체(view frustum)에 대한 정점 클리핑, 원근법을 위한 z값 나누기, 2D 뷰포트에 대한 primitives 매핑 그리고 픽셀 쉐이더 호출 방법을 결정을 포함함
  - 이중에서 픽셀 쉐이더만 선택적으로 사용하고 나머지는 항상 수행함
- 레스터라이저 단계에 들어오는 정점(x, y, z, w)들은 동차 클립 좌표계에 있다고 간주됨
  - 여기서 좌표 공간은 x축은 오른쪽, y축은 위쪽, z축은 카메라로부터 떨이진 곳을 가리킴
- 픽셀 쉐이더를 `NULL`로 설정해서 레스터화를 끌 수 있고 DESC에서 플래그를 줘서 깊이스텐실 테스트를 끌 수 있음
  - 꺼있는 동안 레스터화 관련된 단계는 업데이트 되지 않음
- 계층적 Z-buffer 최적화를 구현한 하드웨어에서 깊이스텐실 테스트를 켠 상태로 픽셀 쉐이더를 `NULL`로 세팅하면 z버퍼를 미리 로딩하는 게 가능함

&emsp;레스터화 관련된 시작하기 문서가 있는데 그것도 살짝 보겠습니다.

#### Viewport(뷰포트) 설정하기

- 뷰포트는 클립 공간상 정점의 위치를 렌더타겟 위치로 매핑할 때 사용
  - 3D 위치를 2D 위치로 확장(scale)함
- 렌더타겟은 Y축이 아래 방향으로 향하는데 뷰포트에서 뒤집어서 확장함
- x, y도 뷰포트 크기에 맞게 다음 공식으로 확장됨

~~~
X = (X + 1) * Viewport.Width * 0.5 + Viewport.TopLeftX
Y = (1 - Y) * Viewport.Height * 0.5 + Viewport.TopLeftY
Z = Viewport.MinDepth + Z * (Viewport.MaxDepth - Viewport.MinDepth)
~~~

- 뷰포트의 MinDepth, MaxDepth는 [0, 1] 사이에 들어와야 함
- 보통 렌더타겟에 매핑하긴 하는데 필수적인 건 아니며 뷰포트의 크기도 렌더타겟과 같을 필요는 없음
- 뷰포트 배열을 만들 수는 있지만 기하 쉐이더에서 온 primitive 출력에 대해서 딱 하나씩만 적용됨
  - 각기 다른 뷰포트를 사용하려면 뷰포트의 ViewportArrayIndex semantic을 명시하고 써야됨
- 파이프라인은 레스터화 하는 동안 기본(default) 뷰포트와 가위 직사각형을 사용함
  - 항상 배열 첫 번째에 위치한 것이 기본값이 됨
- 바인딩될 수 있는 최대 개수는 16개
  - 가위 직사각형도 마찬가지

#### Scissor Rectangle(가위 직사각형) 설정하기

- output merger 단계로 보낼 픽셀의 수를 줄이는 것에 사용
- 설정한 직사각형에서 벗어나면 픽셀은 버려짐
- 정수값으로 크기를 지정하며 레스터화 동안 오직 하나의 직사각형만 적용됨
  - 뷰포트랑 비슷한 방식
- 설정하게 되면 흔히 뷰포트 크기와 동일하게 설정함

~~~ C++
D3D11_RECT rects[1];
  rects[0].left = 0;
  rects[0].right = 640;
  rects[0].top = 0;
  rects[0].bottom = 480;

  g_pd3dContext->RSSetScissorRects( 1, rects );
~~~

Scissor Rectangle 초기화 샘플

- `D3D11_RASTERIZER_DESC1`에 `ScissorEnable`멤버를 사용해서 사용함
- 기본 직사각형을 오버라이딩하기 위해서 ViewportArrayIndex semantic을 GS 출력 요소에 명시해야 한다고 함

#### Rasterizer State 설정하기

- rasterizer state는 rasterizer state 개체에서 캡슐화됨
  - 아마 그냥 이 개체 까보라는 얘기 같네요ㅋㅋ
- device에 설정될 수 있는 개체를 4096개까지 만들 수 있음

~~~ C++
ID3D11RasterizerState1 * g_pRasterState;

    D3D11_RASTERIZER_DESC1 rasterizerState;
    rasterizerState.FillMode = D3D11_FILL_SOLID;
    rasterizerState.CullMode = D3D11_CULL_FRONT;
    rasterizerState.FrontCounterClockwise = true;
    rasterizerState.DepthBias = false;
    rasterizerState.DepthBiasClamp = 0;
    rasterizerState.SlopeScaledDepthBias = 0;
    rasterizerState.DepthClipEnable = true;
    rasterizerState.ScissorEnable = true;
    rasterizerState.MultisampleEnable = false;
    rasterizerState.AntialiasedLineEnable = false;
    rasterizerState.ForcedSampleCount = 0;
    g_pd3dDevice->CreateRasterizerState1( &rasterizerState, &g_pRasterState );

	g_pd3dContext->RSSetState(g_pRasterState);
~~~

레스터라이저 상태 개체 생성 및 설정 샘플

- `D3D11_RASTERIZER_DESC1`, `ID3D11Device1::CreateRasterizerState1`을 써서 만듦

#### Multisampling

- 더 높은 해상도에서 이미지의 요소들을 일부 혹은 전부 샘플링하면서 에일리어싱(aliasing)을 줄이는 것
- 서브 픽셀 샘플들이 필요하지만 현대 GPU의 구현에서는 픽셀당 한 번씩만 픽셀 쉐이더가 작동하도록 구현됨
  - 성능과 최종 이미지 품질 사이의 교환(trade-off)
- 사용하려면 레스터화 DESC에서 사용 가능을 활성화한 후에
  - 멀티샘플된 렌더타겟을 생성하고 쉐이더를 갖고 렌더타겟을 읽어 샘플들을 단일 픽셀로 분해
  - 또는 `ID3D11DeviceContext::ResolveSubresource`를 호출해서 하드웨어를 사용해서 분해
- 샘플 마스크 사용되든, alpha-to-coverage가 사용가능하든, 스텐실 작업이 있든 상관없이 독립적임
- 깊이 테스트에서 다음과 같은 영향을 미침
  - 샘플당 깊이가 보간되고 깊이/스텐실 테스트도 샘플당 수행되며 픽셀 쉐이더 색상은 통과하는 모든 샘플에 대해 복제됨
    - 깊이 값이면 깊이가 복제됨
  - 멀티샘플링이 꺼져도 깊이/스텐실 테스트는 여전히 샘플 단위로 진행되지만 깊이 보간은 되지 않음
- 단일 렌더타겟 내에서 멀티샘플링, 비멀티샘플링 렌더링 자체는 제약없이 가능함
  - 가령 멀티샘플링 렌더링을 비멀티샘플링 렌더타겟에다 하면 픽셀 하나당 샘플 하나로 잡혀서 사실상 멀티샘플 안 한 것처럼 결과가 나옴

#### Rasterization Rules

&emsp;레스터화 규칙은 어떻게 벡터 데이터를 레스터 데이터로 매핑하는지 정의하는 것인데 이 부분은 이것만 해도 그래픽스 책 한 부분을 차지해야 할 것 같아서 넘어가겠습니다ㅋㅋ 사실 지금까지 써넣은 것도 너무 과하게 쓴 느낌이 있네요!

### Pixel Shader(PS) Stage

- 픽셀당 라이팅, 후처리와 같은 쉐이딩 기술을 가능하게 해주는 단계
- 상수 변수들, 텍스쳐 데이터, 보간된 정점값들, 픽셀당 출력들을 만들어내는 다른 데이터들로 결합된 프로그램
- 레스터라이저 단계에서 픽셀 쉐이더를 각 픽셀당 한 번씩 호출해줌
  - 여기서 픽셀들은 primitive에 의해서 덮힌 부분
  - 멀티샘플링해도 얼추 비슷하게 동작하고 각각에 대해서 깊이/스텐실 테스트가 수행됨
- NULL로 설정해서 쉐이더 작동을 막을 수 있음

&emsp;내장 함수가 미분을 이용하고 하드웨어는 픽셀 여러 개를 묶어서 작동시키고 어쩌구 내용이 나와있긴 한데 번역기를 돌리든 제가 해석을 하든 뭔가 딱 오는 느낌이 없어서 일단 넘어가겠습니다ㅠㅋㅋ

#### 입력

- 기하 쉐이더 없이 파이프라인이 구성되면 32비트 4요소 벡터 16개까지로 제한됨
  - 그렇지 않다면 32개까지
- 정점 속성들(attributes)을 포함하거나 primitive당 상수들로서 처리될 수 있음
  - 속성들은 원근 보정 유무와 관계없이 보간될 수 있는 걸 말함
  - 보간 모드는 클리핑 중에도 적용됨
- system-value semanic에 의해서도 선언될 수 있음

&emsp;이외에도 픽셀 쉐이더 중심 위치에서 보간이 일어나고 입력 레지스터에 선언되고 가급적이면 중심이 위치하게금 하고 여차저차한 내용들이 있습니다.

#### 출력

- 32비트 4요소 색상들을 8개까지 출력할 수 있음
  - 모종의 이유로 픽셀이 버려지면 출력 안 함
- 출력 레지스터 요소들은 반드시 사용되기 전에 선언되어야 함
  - 각 레지스터는 개별적인 출력 쓰기 마스크가 허용됨
- 깊이 데이터가 깊이 버퍼에 쓰여질지를 제어하기 위해서는 OM 단계에서 depth-write-enable state를 사용
  - 혹은 픽셀 데이터를 버리기 위해서 버리기 명령어를 사용
- 깊이 테스트를 위해서 선택적으로 32비트 1요소를 출력할 수 있음
- 고정 함수 깊이를 사용하는 것 또는 쉐이더 oDepth를 사용하는 것 사이를 동적으로 바꿀 방법은 없음
- 스텐실 값을 출력할 수 없음

### Output-Merger(OM) Stage

- 최종적인 픽셀의 색상을 만들어내는 단계
- 다음을 활용하여 결정하게 됨
  - 파이프라인 상태의 조합(combination of pipeline state)
  - 픽셀 쉐이더에 의해 생성된 픽셀 데이터
  - 렌더타겟의 내용물
  - 깊이/스텐실 버퍼의 내용물들을 사용

#### Depth-Stencil buffer

- 텍스쳐 리소스로서 만들어지는 걸로 깊이와 스텐실 데이터를 모두 포함
  - 깊이 데이터는 어느 픽셀이 카메라에 더 가까울지 결정해줌
  - 스텐실 데이터는 어느 픽셀들이 업데이트 될 수 있는지 마스크 하는데 사용됨
- 버퍼의 내용을 통해서 최종적으로 그려져야 할 픽셀을 결정하는데 사용함
  - 깊이, 스텐실 모두 그러함

#### Blending

- 최종 색상을 만들어 내기 위해서 하나 이상의 색상을 조합하는 것
- RGB, alpha 이렇게 두 번 구현됐다고 볼 수도 있다고 함

#### Dual-Source Color Blending

- 슬롯0에 있는 단일 렌더타겟으로 블랜딩 연산에 대해서 OM 단계가 두 개의 픽셀 쉐이더 출력을 입력으로 동시에 사용할 수 있게 해주는 것
  - o0, o1만 가능
- 슬롯0에 바인딩 안 돼 있으면 못 씀

#### Multiple RenderTargets

- 픽셀 쉐이더는 적어도 8개의 별도의 렌더타겟에 렌더링될 수 있음
  - 모두 같은 타입이어야 함
    - buffer, Texture1D, Texture1DArray 등등
  - 그리고 모든 렌더타겟은 모든 차원에서 반드시 크기가 같아야 함
    - 너비, 높이, 깊이, 배열 크기, 샘플 수 등등
  - 단, 다른 데이터 형식을 가질 수는 있음
- 여러 렌더타겟 조합을 사용할 수 있지만 리소스뷰는 동시에 다중 렌더타겟 슬롯에 바인딩될 수 없음
  - 뷰는 동시에 사용되지 않으면 재활용될 수 있긴함

#### Output-Write Mask

- 요소당 어떤 데이터가 렌더타겟에 쓰여질지 제어하기 위해서 사용

#### Sample Mask

- 활성화된 렌더타겟에서 어느 샘플들이 업데이트될지 결정하는 32비트 멀티샘플 커버리지 마스크(multisample coverage mask)
- 오로지 한 샘플 마스크만 허용됨
- 리소스에서 샘플에 대한 샘플 마스크에서의 비트 매핑은 사용자에 의해서 정의됨

&emsp;이외에도 더 많은 관련된 내용들이 있는데 지금까지 쓴 것도 좀 과하다는 느낌이라 일단 여기까지 하겠습니다.

&emsp;파이프라인은 쓸데없이 내용을 많이 적은 느낌이네요ㅋㅋ

## 소스코드 깃 주소

[DrawTriangle](https://github.com/redbindy/DX11ForPost/tree/master/DrawTriangle)

&emsp;코드 자체는 두 번째 버전만 최종으로 올려뒀습니다!

## 참고자료 및 출처
- [DirectX-SDK-Samples](https://github.com/walbourn/directx-sdk-samples)
- [MSDN - D3DCompileFromFile function (d3dcompiler.h)](https://learn.microsoft.com/en-us/windows/win32/api/d3dcompiler/nf-d3dcompiler-d3dcompilefromfile)
- [MSDN - ID3D11Device::CreateVertexShader method (d3d11.h)](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11device-createvertexshader)
- [MSDN - ID3D11Device::CreatePixelShader method (d3d11.h)](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11device-createpixelshader)
- [MSDN - ID3DBlob interface](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/legacy/ff728743(v=vs.85))
- [MSDN - D3D11_INPUT_ELEMENT_DESC structure (d3d11.h)](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/ns-d3d11-d3d11_input_element_desc)
- [MSDN - Getting Started with the Input-Assembler Stage](https://learn.microsoft.com/en-us/windows/win32/direct3d11/d3d10-graphics-programming-guide-input-assembler-stage-getting-started)
- [풍풍풍님의 네이버 블로그 - 복수 인스턴스 렌더링 하기 (인스턴싱 Instancing)](https://blog.naver.com/sorkelf/40171221589)
- [MSDN - D3D11_BUFFER_DESC structure (d3d11.h)](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/ns-d3d11-d3d11_buffer_desc)
- [MSDN - Primitive Topologies](https://learn.microsoft.com/en-us/windows/win32/direct3d11/d3d10-graphics-programming-guide-primitive-topologies)
- [MSDM - Rendering from Vertex and Index Buffers (Direct3D 9)](https://learn.microsoft.com/en-us/windows/win32/direct3d9/rendering-from-vertex-and-index-buffers)
- [[유니티 TIPS] 알쓸유잡 \| 병목 (Bottleneck) - CPU vs GPU, 메모리. 최적화 및 프로파일링 팁](https://www.youtube.com/watch?v=o3o7fVCV4OA)
- [MSDN - ID3D11DeviceContext::IASetIndexBuffer method (d3d11.h)](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-iasetindexbuffer)
- [MSDN - ID3D11DeviceContext::DrawIndexed method (d3d11.h)](https://learn.microsoft.com/en-us/windows/win32/api/d3d11/nf-d3d11-id3d11devicecontext-drawindexed)
- [Wikipedia - Shader](https://en.wikipedia.org/wiki/Shader)
- [컴퓨트 셰이더 - Unity 매뉴얼](https://docs.unity3d.com/kr/2018.4/Manual/class-ComputeShader.html)
- [MSDN - Graphics pipeline](https://learn.microsoft.com/en-us/windows/win32/direct3d11/overviews-direct3d-11-graphics-pipeline)
- [경향신문 - 예술속 수학이야기, (45)에셔와 테셀레이션](https://www.khan.co.kr/article/200712040927211)
- [자기계발을 멈추면 죽는다 - 스키닝(skinning)-1](https://skmagic.tistory.com/18)
- "OpenGL ES를 이용한 3차원 컴퓨터 그래픽스 입문, 한정현, 도서출판 홍릉, 2019.05.31, p.62"