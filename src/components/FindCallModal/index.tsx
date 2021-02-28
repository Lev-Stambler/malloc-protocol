import React, { useState } from "react";
import { Modal, Form, AutoComplete, Button } from 'antd';
import { RegisterCallModal } from '../RegisterCallModal';

export interface FindCallModalProps {
  isVisible: boolean,
  onCancel: () => void,
  onOk: (name: string) => void
}

export function FindCallModal(props: FindCallModalProps) { 
  const [registerCallVisible, setRegisterCallVisible] = useState(false);
  const { isVisible, onCancel, onOk } = props;

  const openRegisterCall = () => {
    setRegisterCallVisible(true);
  }

  const closeRegisterCall = () => {
    setRegisterCallVisible(false);
  }

  return (
    <Modal title="Find Call" visible={isVisible} footer={null} closable={false}>
      <RegisterCallModal isVisible={registerCallVisible} onOk={closeRegisterCall} onCancel={closeRegisterCall}/>
      <Form name="find-call" onFinish={onOk} >
        <Form.Item name={'name'} label="Search Calls" rules={[{ required: true }]}>
          <AutoComplete/>
        </Form.Item>
        <Form.Item>
          <div className="flex flex-row w-full justify-end">
            <div className="flex-grow justiy-start">
              <Button type="default" onClick={onCancel}>
                Cancel
              </Button>
            </div>
            <Button className="mr-2" type="primary" htmlType="submit">
              Create Node
            </Button>
            <Button type="default" onClick={openRegisterCall}>
              Register New Call
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  )
}

